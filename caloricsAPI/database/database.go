package database

import (
	"calorics/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	database, err := gorm.Open(sqlite.Open("calories.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto Migrate the schemas
	err = database.AutoMigrate(&models.User{}, &models.FoodEntry{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = database
}
