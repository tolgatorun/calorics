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
		protected.POST("/food-entries", createFoodEntry)
		protected.GET("/food-entries", getUserFoodEntries)
		protected.DELETE("/food-entries/:id", deleteFoodEntry)
		protected.POST("/food-entries/direct", createDirectFoodEntry)
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

	var user models.User
	// Get today's food entries
	today := time.Now().Format("2006-01-02")
	if err := config.DB.Preload("FoodEntries", "date = ?", today).First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Calculate fat percentage
	fatPercentage := user.CalculateFatPercentage()
	age := user.CalculateAge()
	// Calculate daily calories
	var dailyCalories float64
	for _, entry := range user.FoodEntries {
		if entry.Date == today {
			dailyCalories += entry.Calories
		}
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
	}

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

func createFoodEntry(c *gin.Context) {
	var foodEntry models.FoodEntry
	if err := c.ShouldBindJSON(&foodEntry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	foodEntry.UserID = userID

	// Load the food data
	if err := config.DB.First(&foodEntry.Food, foodEntry.FoodID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid food ID"})
		return
	}

	if err := config.DB.Create(&foodEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food entry"})
		return
	}

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
	if err := query.Find(&entries).Error; err != nil {
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
		Quantity: directEntry.Quantity,
		Date:     directEntry.Date,
		Calories: caloriesForQuantity,
	}

	if err := config.DB.Create(&foodEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food entry"})
		return
	}

	c.JSON(http.StatusOK, foodEntry)
}
