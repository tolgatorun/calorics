package main

import (
	"caloricsAPI/config"
	"caloricsAPI/middleware"
	"caloricsAPI/models"
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// Add this new struct for direct food entry
type DirectFoodEntry struct {
	Name     string `json:"name" binding:"required"`
	Calories int    `json:"calories" binding:"required"`
	Quantity int    `json:"quantity" binding:"required"`
	Date     string `json:"date" binding:"required"`
}

func main() {
	router := gin.Default()

	// Configure CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Connect to database
	config.ConnectDatabase()

	// Public routes
	router.POST("/api/register", register)
	router.POST("/api/login", login)

	// Protected routes
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/user/stats", getUserStats)
		protected.GET("/user/profile", getProfile)
		protected.PUT("/user/profile", updateProfile)
		protected.GET("/foods", getFoods)
		protected.POST("/food-entries", createFoodEntry)
		protected.GET("/food-entries", getUserFoodEntries)
		protected.DELETE("/food-entries/:id", deleteFoodEntry)
		protected.GET("/debug/food-entries", debugFoodEntries)
		protected.POST("/food-sets", createFoodSet)
		protected.GET("/food-sets", getUserFoodSets)
		//protected.GET("/food-sets/:id", getFoodSet)
		//protected.PUT("/food-sets/:id", updateFoodSet)
		protected.DELETE("/food-sets/:id", deleteFoodSet)
		protected.POST("/food-sets/:id/apply", applyFoodSet)
		protected.GET("/user/weekly-stats", getWeeklyStats)
	}

	router.Run(":8080")
}

func register(c *gin.Context) {
	var user models.User

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	user.Password = string(hashedPassword)

	// Set default values
	if user.Goal == "" {
		user.Goal = "maintain"
	}

	// Create user
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registration successful"})
}

func login(c *gin.Context) {
	var loginReq models.LoginRequest
	var user models.User

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	if err := config.DB.Where("email = ?", loginReq.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginReq.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token
	token, err := middleware.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.LoginResponse{
		Token: token,
		User:  user,
	})
}

func getUserStats(c *gin.Context) {
	userID := c.GetUint("user_id")
	log.Printf("Fetching stats for user ID: %d", userID)

	// Get date from query parameter or use today's date
	var targetDate string
	queryDate := c.Query("date")
	if queryDate != "" {
		// Validate the date format
		if _, err := time.Parse("2006-01-02", queryDate); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		targetDate = queryDate
	} else {
		targetDate = time.Now().Format("2006-01-02")
	}

	var user models.User
	if err := config.DB.Preload("FoodEntries").
		Preload("FoodEntries.Food").
		First(&user, userID).Error; err != nil {
		log.Printf("Error fetching user data: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Filter entries for target date
	var dateEntries []models.FoodEntry
	for _, entry := range user.FoodEntries {
		if entry.Date == targetDate {
			dateEntries = append(dateEntries, entry)
		}
	}

	log.Printf("Found %d food entries for date %s", len(dateEntries), targetDate)

	// Calculate fat percentage and age
	fatPercentage := user.CalculateFatPercentage()
	age := user.CalculateAge()

	// Calculate daily calories from filtered entries
	var dailyCalories float64
	for _, entry := range dateEntries {
		dailyCalories += entry.Calories
	}

	// Get needed calories
	neededCalories := user.CalculateNeededCalories()

	// Create stats response
	stats := models.UserStats{
		DailyCalories:    dailyCalories,
		NeededCalories:   neededCalories,
		CurrentWeight:    user.Weight,
		NeckMeasurement:  user.NeckMeasure,
		WaistMeasurement: user.WaistMeasure,
		FatPercentage:    fatPercentage,
		Goal:             user.Goal,
		Age:              age,
		FoodEntries:      dateEntries,
	}

	log.Printf("Returning stats with %d food entries for date %s", len(stats.FoodEntries), targetDate)
	c.JSON(http.StatusOK, stats)
}

func getProfile(c *gin.Context) {
	userID := c.GetUint("user_id")
	var user models.User

	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Calculate age and fat percentage before sending response
	user.CalculateAge()
	user.CalculateFatPercentage()

	// Create a response without sensitive information
	profile := gin.H{
		"name":          user.Name,
		"email":         user.Email,
		"gender":        user.Gender,
		"birthday":      user.Birthday,
		"age":           user.Age,
		"weight":        user.Weight,
		"height":        user.Height,
		"neckMeasure":   user.NeckMeasure,
		"waistMeasure":  user.WaistMeasure,
		"hipMeasure":    user.HipMeasure,
		"fatPercentage": user.FatPercentage,
		"goal":          user.Goal,
	}

	// Log the profile for debugging
	log.Printf("User profile: %+v", profile)

	c.JSON(http.StatusOK, profile)
}

func updateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")
	var user models.User
	var updateData struct {
		CurrentWeight    int    `json:"currentWeight"`
		Height           int    `json:"height"`
		NeckMeasurement  int    `json:"neckMeasurement"`
		WaistMeasurement int    `json:"waistMeasurement"`
		HipMeasurement   int    `json:"hipMeasurement"`
		Goal             string `json:"goal" binding:"omitempty,oneof=lose maintain gain"`
	}

	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update user data
	user.Weight = updateData.CurrentWeight
	user.Height = updateData.Height
	user.NeckMeasure = updateData.NeckMeasurement
	user.WaistMeasure = updateData.WaistMeasurement
	user.HipMeasure = updateData.HipMeasurement
	if updateData.Goal != "" {
		user.Goal = updateData.Goal
	}

	// Calculate fat percentage and needed calories
	user.CalculateFatPercentage()
	neededCalories := user.CalculateNeededCalories()

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Return updated profile including fat percentage, goal, and needed calories
	c.JSON(http.StatusOK, gin.H{
		"message":        "Profile updated successfully",
		"fatPercentage":  user.FatPercentage,
		"goal":           user.Goal,
		"neededCalories": neededCalories,
	})
}

func getFoods(c *gin.Context) {
	var foods []models.Food
	if err := config.DB.Find(&foods).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch foods"})
		return
	}

	type FoodResponse struct {
		ID            uint                 `json:"ID"`
		Name          string               `json:"name"`
		Calories      int                  `json:"calories"`
		Protein       float64              `json:"protein"`
		Carbohydrates float64              `json:"carbohydrates"`
		Fat           float64              `json:"fat"`
		ServingSize   int                  `json:"serving_size"`
		Category      string               `json:"category"`
		Servings      []models.FoodServing `json:"servings"`
	}

	var response []FoodResponse
	for _, food := range foods {
		var servings []models.FoodServing
		if err := config.DB.Where("food_id = ?", food.ID).Find(&servings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food servings"})
			return
		}

		response = append(response, FoodResponse{
			ID:            food.ID,
			Name:          food.Name,
			Calories:      food.Calories,
			Protein:       food.Protein,
			Carbohydrates: food.Carbohydrates,
			Fat:           food.Fat,
			ServingSize:   food.ServingSize,
			Category:      food.Category,
			Servings:      servings,
		})
	}

	c.JSON(http.StatusOK, response)
}

func createFoodEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	var foodEntry models.FoodEntry

	if err := c.ShouldBindJSON(&foodEntry); err != nil {
		log.Printf("Error binding food entry JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set the user ID
	foodEntry.UserID = userID

	// Load the food data to calculate calories
	var food models.Food
	if err := config.DB.First(&food, foodEntry.FoodID).Error; err != nil {
		log.Printf("Error loading food data: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid food ID"})
		return
	}

	// Find the serving size
	var serving models.FoodServing
	if err := config.DB.Where("food_id = ? AND description = ?", foodEntry.FoodID, foodEntry.ServingDesc).First(&serving).Error; err != nil {
		log.Printf("Error loading serving data: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid serving size"})
		return
	}

	// Calculate calories based on serving size and quantity
	// (calories per 100g * serving grams * quantity) / 100
	foodEntry.Calories = float64(food.Calories) * serving.Grams * foodEntry.Quantity / 100.0

	log.Printf("Calculated calories: %f (food calories per 100g: %d, serving grams: %f, quantity: %f)",
		foodEntry.Calories, food.Calories, serving.Grams, foodEntry.Quantity)

	// Ensure the date is in the correct format (YYYY-MM-DD)
	if foodEntry.Date == "" {
		foodEntry.Date = time.Now().Format("2006-01-02")
	} else {
		// Try to parse and reformat the date to ensure consistency
		parsedDate, err := time.Parse("2006-01-02", foodEntry.Date)
		if err != nil {
			log.Printf("Invalid date format: %s", foodEntry.Date)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
			return
		}
		foodEntry.Date = parsedDate.Format("2006-01-02")
	}

	log.Printf("Creating food entry for user %d: Date=%s, FoodID=%d, Quantity=%f, Calories=%f",
		userID, foodEntry.Date, foodEntry.FoodID, foodEntry.Quantity, foodEntry.Calories)

	// Create the food entry
	if err := config.DB.Create(&foodEntry).Error; err != nil {
		log.Printf("Error creating food entry: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food entry"})
		return
	}

	// Load the associated food data for the response
	if err := config.DB.Preload("Food").First(&foodEntry, foodEntry.ID).Error; err != nil {
		log.Printf("Error loading food data for response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load food data"})
		return
	}

	log.Printf("Successfully created food entry: ID=%d, Date=%s, Food=%s, Calories=%f",
		foodEntry.ID, foodEntry.Date, foodEntry.Food.Name, foodEntry.Calories)

	c.JSON(http.StatusOK, foodEntry)
}

func getUserFoodEntries(c *gin.Context) {
	userID := c.GetUint("user_id")
	date := c.Query("date") // Optional date filter

	query := config.DB.Preload("Food").Where("user_id = ?", userID)
	if date != "" {
		query = query.Where("date = ?", date)
	}

	var entries []models.FoodEntry
	if err := query.Order("created_at desc").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food entries"})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func deleteFoodEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	entryID := c.Param("id")

	var entry models.FoodEntry
	if err := config.DB.Where("id = ? AND user_id = ?", entryID, userID).First(&entry).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Food entry not found"})
		return
	}

	if err := config.DB.Delete(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete food entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Food entry deleted successfully"})
}

func createDirectFoodEntry(c *gin.Context) {
	var directEntry DirectFoodEntry
	if err := c.ShouldBindJSON(&directEntry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")

	// Create the food
	food := models.Food{
		Name:        directEntry.Name,
		Calories:    directEntry.Calories,
		ServingSize: 100, // Default serving size of 100g
	}

	if err := config.DB.Create(&food).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food"})
		return
	}

	// Calculate calories based on quantity
	caloriesForQuantity := float64(directEntry.Calories) * float64(directEntry.Quantity) / 100.0

	// Create the food entry
	foodEntry := models.FoodEntry{
		UserID:   userID,
		FoodID:   food.ID,
		Food:     food,
		Quantity: float64(directEntry.Quantity),
		Date:     directEntry.Date,
		Calories: caloriesForQuantity,
	}

	if err := config.DB.Create(&foodEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food entry"})
		return
	}

	c.JSON(http.StatusOK, foodEntry)
}

func debugFoodEntries(c *gin.Context) {
	userID := c.GetUint("user_id")
	var entries []models.FoodEntry

	if err := config.DB.Where("user_id = ?", userID).
		Preload("Food").
		Find(&entries).Error; err != nil {
		log.Printf("Error fetching food entries: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food entries"})
		return
	}

	log.Printf("Found %d total food entries for user %d", len(entries), userID)
	for i, entry := range entries {
		log.Printf("Entry %d: Date: %s, Food ID: %d, Name: %s, Calories: %f",
			i, entry.Date, entry.FoodID, entry.Food.Name, entry.Calories)
	}

	c.JSON(http.StatusOK, entries)
}

func createFoodSet(c *gin.Context) {
	userID := c.GetUint("user_id")
	var foodSet models.FoodSet

	if err := c.ShouldBindJSON(&foodSet); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	foodSet.UserID = userID

	// Validate and process each food entry
	for i := range foodSet.Entries {
		entry := &foodSet.Entries[i]
		entry.UserID = userID

		// Load food data and calculate calories
		var food models.Food
		if err := config.DB.First(&food, entry.FoodID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid food ID in entry"})
			return
		}

		// Find serving size
		var serving models.FoodServing
		if err := config.DB.Where("food_id = ? AND description = ?", entry.FoodID, entry.ServingDesc).
			First(&serving).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid serving size"})
			return
		}

		// Calculate calories
		entry.Calories = float64(food.Calories) * serving.Grams * entry.Quantity / 100.0
	}

	if err := config.DB.Create(&foodSet).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food set"})
		return
	}

	c.JSON(http.StatusOK, foodSet)
}

func getUserFoodSets(c *gin.Context) {
	userID := c.GetUint("user_id")
	var foodSets []models.FoodSet

	if err := config.DB.Where("user_id = ?", userID).
		Preload("Entries.Food").
		Find(&foodSets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food sets"})
		return
	}

	c.JSON(http.StatusOK, foodSets)
}

func applyFoodSet(c *gin.Context) {
	userID := c.GetUint("user_id")
	setID := c.Param("id")
	date := c.Query("date")

	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// Load the food set with full food data
	var foodSet models.FoodSet
	if err := config.DB.Where("id = ? AND user_id = ?", setID, userID).
		Preload("Entries.Food").First(&foodSet).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Food set not found"})
		return
	}

	// Create new entries for the current date
	var newEntries []models.FoodEntry
	for _, entry := range foodSet.Entries {
		newEntry := models.FoodEntry{
			UserID:      userID,
			FoodID:      entry.FoodID,
			ServingDesc: entry.ServingDesc,
			Quantity:    entry.Quantity,
			Date:        date,
			Calories:    entry.Calories,
			Food:        entry.Food,
		}
		newEntries = append(newEntries, newEntry)
	}

	// Save all new entries
	if err := config.DB.Create(&newEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food entries"})
		return
	}

	c.JSON(http.StatusOK, newEntries)
}

func deleteFoodSet(c *gin.Context) {
	userID := c.GetUint("user_id")
	setID := c.Param("id")

	// First verify the food set belongs to the user
	var foodSet models.FoodSet
	if err := config.DB.Where("id = ? AND user_id = ?", setID, userID).First(&foodSet).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Food set not found"})
		return
	}

	// Delete the food set (this will automatically delete associated entries due to GORM's cascading delete)
	if err := config.DB.Delete(&foodSet).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete food set"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Food set deleted successfully"})
}

func getWeeklyStats(c *gin.Context) {
	userID := c.GetUint("user_id")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Start date and end date are required"})
		return
	}

	var foodEntries []models.FoodEntry
	if err := config.DB.Where("user_id = ? AND date BETWEEN ? AND ?", userID, startDate, endDate).
		Find(&foodEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food entries"})
		return
	}

	// Get user's needed calories
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		return
	}

	// Calculate total calories consumed
	totalCalories := 0.0
	for _, entry := range foodEntries {
		totalCalories += entry.Calories
	}

	// Calculate weekly calorie goal (daily goal * 7 days)
	weeklyCalorieGoal := float64(user.CalculateNeededCalories() * 7)

	// Calculate the weekly achievement percentage
	weeklyPercentage := (totalCalories / weeklyCalorieGoal) * 100

	c.JSON(http.StatusOK, gin.H{
		"totalCalories":     totalCalories,
		"averagePercentage": weeklyPercentage,
	})
}
