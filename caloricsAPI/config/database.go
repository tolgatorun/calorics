package config

import (
	"caloricsAPI/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Open database with specific options
	database, err := gorm.Open(sqlite.Open("calorics.db"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto Migrate the models (this will only add missing fields/tables)
	err = database.AutoMigrate(&models.User{}, &models.FoodEntry{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = database
}
