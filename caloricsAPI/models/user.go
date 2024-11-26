package models

import (
	"gorm.io/gorm"
	// "time"
)

type User struct {
	gorm.Model
	Name     string      `json:"name"`
	Email    string      `json:"email" gorm:"unique"`
	Password string      `json:"password"`
	Weight   float64     `json:"weight"` // in kg
	Height   float64     `json:"height"` // in cm
	Age      int         `json:"age"`
	Neck     float64     `json:"neck"`  // in cm
	Waist    float64     `json:"waist"` // in cm
	Entries  []FoodEntry `json:"entries" gorm:"foreignKey:UserID"`
}
