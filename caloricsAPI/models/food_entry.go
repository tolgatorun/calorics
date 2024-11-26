package models

import (
	"time"

	"gorm.io/gorm"
)

type FoodEntry struct {
	gorm.Model
	UserID      uint      `json:"user_id"`
	FoodName    string    `json:"food_name"`
	Calories    int       `json:"calories"`
	Date        time.Time `json:"date"`
	ServingSize float64   `json:"serving_size"` // in grams
}
