package config

import (
	"caloricsAPI/models"
	"encoding/csv"
	"log"
	"os"
	"strconv"
	"strings"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func seedFoodData(db *gorm.DB) error {
	// Check if foods already exist
	var count int64
	db.Model(&models.Food{}).Count(&count)
	if count > 0 {
		return nil // Foods already exist, don't reseed
	}

	// Only drop and recreate food-related tables
	err := db.Migrator().DropTable(&models.FoodServing{}, &models.Food{})
	if err != nil {
		return err
	}

	// Recreate food-related tables
	err = db.AutoMigrate(&models.Food{}, &models.FoodServing{})
	if err != nil {
		return err
	}

	// Read the dataset CSV file
	file, err := os.Open("../dataset.csv")
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Skip header
	_, err = reader.Read()
	if err != nil {
		return err
	}

	// Read and process each row
	for {
		record, err := reader.Read()
		if err != nil {
			break // End of file
		}

		// Skip empty or invalid rows
		if len(record) < 6 {
			continue
		}

		// Parse values (multiply by 100 since dataset is per gram)
		calories, _ := strconv.ParseFloat(strings.TrimSpace(record[2]), 64)
		fat, _ := strconv.ParseFloat(strings.TrimSpace(record[3]), 64)
		carbs, _ := strconv.ParseFloat(strings.TrimSpace(record[4]), 64)
		protein, _ := strconv.ParseFloat(strings.TrimSpace(record[5]), 64)

		name := strings.TrimSpace(record[0])
		if name == "deprecated" {
			continue
		}

		// Create food entry with values per 100g
		food := models.Food{
			Name:          name,
			Calories:      int(calories * 100),
			Protein:       protein * 100,
			Carbohydrates: carbs * 100,
			Fat:           fat * 100,
			ServingSize:   100,
			Category:      "General",
		}

		if err := db.Create(&food).Error; err != nil {
			log.Printf("Error creating food %s: %v", food.Name, err)
			continue
		}

		// Add standard serving sizes
		servings := []models.FoodServing{
			{
				FoodID:      food.ID,
				Description: "100 grams",
				Grams:       100,
			},
			{
				FoodID:      food.ID,
				Description: "50 grams",
				Grams:       50,
			},
		}

		// Add specific servings based on food type
		switch {
		case strings.Contains(strings.ToLower(name), "oil") ||
			strings.Contains(strings.ToLower(name), "sauce") ||
			strings.Contains(strings.ToLower(name), "dressing"):
			servings = append(servings, []models.FoodServing{
				{
					FoodID:      food.ID,
					Description: "1 tablespoon",
					Grams:       15,
				},
				{
					FoodID:      food.ID,
					Description: "1 teaspoon",
					Grams:       5,
				},
			}...)
		case strings.Contains(strings.ToLower(name), "fruit") ||
			strings.Contains(strings.ToLower(name), "apple") ||
			strings.Contains(strings.ToLower(name), "orange") ||
			strings.Contains(strings.ToLower(name), "banana") ||
			strings.Contains(strings.ToLower(name), "pear") ||
			strings.Contains(strings.ToLower(name), "peach"):
			servings = append(servings, models.FoodServing{
				FoodID:      food.ID,
				Description: "1 medium piece",
				Grams:       150,
			})
		case strings.Contains(strings.ToLower(name), "egg"):
			servings = append(servings, models.FoodServing{
				FoodID:      food.ID,
				Description: "1 piece",
				Grams:       50,
			})
		case strings.Contains(strings.ToLower(name), "bread") ||
			strings.Contains(strings.ToLower(name), "toast"):
			servings = append(servings, models.FoodServing{
				FoodID:      food.ID,
				Description: "1 slice",
				Grams:       30,
			})
		case strings.Contains(strings.ToLower(name), "rice") ||
			strings.Contains(strings.ToLower(name), "pasta") ||
			strings.Contains(strings.ToLower(name), "noodle"):
			servings = append(servings, models.FoodServing{
				FoodID:      food.ID,
				Description: "1 cup cooked",
				Grams:       200,
			})
		}

		for _, serving := range servings {
			if err := db.Create(&serving).Error; err != nil {
				log.Printf("Error creating serving for food %s: %v", food.Name, err)
			}
		}
	}

	return nil
}

func ConnectDatabase() {
	// Open database with specific options
	database, err := gorm.Open(sqlite.Open("calorics.db"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// First migrate all tables to ensure they exist
	err = database.AutoMigrate(&models.User{}, &models.Food{}, &models.FoodServing{}, &models.FoodEntry{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Then seed food data if needed
	if err := seedFoodData(database); err != nil {
		log.Fatal("Failed to seed food data:", err)
	}

	DB = database
}
