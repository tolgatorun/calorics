package models

import (
	"log"
	"math"
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name          string      `json:"name" binding:"required"`
	Email         string      `json:"email" binding:"required,email" gorm:"unique"`
	Password      string      `json:"password" binding:"required"`
	Gender        string      `json:"gender" binding:"required,oneof=male female"`
	Birthday      string      `json:"birthday" binding:"required"`
	Weight        int         `json:"weight,omitempty"`
	Height        int         `json:"height,omitempty"`
	Age           int         `json:"age,omitempty" gorm:"-"`
	WaistMeasure  int         `json:"waist_measure,omitempty"`
	NeckMeasure   int         `json:"neck_measure,omitempty"`
	HipMeasure    int         `json:"hip_measure,omitempty"`
	FatPercentage int         `json:"fat_percentage,omitempty" gorm:"->"`
	Goal          string      `json:"goal" gorm:"default:'maintain'" binding:"omitempty,oneof=lose maintain gain"`
	FoodEntries   []FoodEntry `json:"food_entries,omitempty" gorm:"foreignKey:UserID"`
}

type UserStats struct {
	DailyCalories    float64     `json:"dailyCalories"`
	NeededCalories   int         `json:"neededCalories"`
	CurrentWeight    int         `json:"currentWeight"`
	NeckMeasurement  int         `json:"neckMeasurement"`
	WaistMeasurement int         `json:"waistMeasurement"`
	HipMeasurement   int         `json:"hipMeasurement"`
	FatPercentage    int         `json:"fatPercentage"`
	Goal             string      `json:"goal"`
	Age              int         `json:"age"`
	FoodEntries      []FoodEntry `json:"foodEntries"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

func (u *User) CalculateFatPercentage() int {
	if u.WaistMeasure == 0 || u.NeckMeasure == 0 || u.Height == 0 {
		u.FatPercentage = 0
		return 0
	}

	height := float64(u.Height)
	var result float64

	if u.Gender == "male" {
		waistNeck := float64(u.WaistMeasure - u.NeckMeasure)
		if waistNeck <= 0 {
			u.FatPercentage = 0
			return 0
		}
		result = 495/(1.0324-0.19077*math.Log10(waistNeck)+0.15456*math.Log10(height)) - 450
	} else {
		if u.HipMeasure == 0 {
			u.FatPercentage = 0
			return 0
		}
		// U.S. Navy formula for females using hip measurement
		waist := float64(u.WaistMeasure)
		hip := float64(u.HipMeasure)
		neck := float64(u.NeckMeasure)
		result = 495/(1.29579-0.35004*math.Log10(waist+hip-neck)+0.22100*math.Log10(height)) - 450
	}

	// Ensure the result is within reasonable bounds (5-50%)
	if result < 5 {
		result = 5
	} else if result > 50 {
		result = 50
	}

	// Log the calculation details
	//log.Printf("Fat percentage calculation: Gender=%s, Height=%d, Waist=%d, Neck=%d, Hip=%d, Result=%f",
	//	u.Gender, u.Height, u.WaistMeasure, u.NeckMeasure, u.HipMeasure, result)

	fatPercentage := int(math.Round(result))
	u.FatPercentage = fatPercentage
	return fatPercentage
}

func (u *User) CalculateNeededCalories() int {
	// Calculate age first
	u.CalculateAge()

	// Calculate BMR using Mifflin-St Jeor Equation
	// BMR = (10 × weight) + (6.25 × height) - (5 × age) + s
	// where s is +5 for males and -161 for females
	weight := float64(u.Weight)
	height := float64(u.Height)
	age := float64(u.Age)

	var bmr float64
	if u.Gender == "male" {
		bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
	} else {
		bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
	}

	// Activity multiplier based on goal
	var activityMultiplier float64
	switch u.Goal {
	case "lose":
		activityMultiplier = 1.2 // Sedentary (little or no exercise)
	case "maintain":
		activityMultiplier = 1.55 // Moderate exercise (3-5 days/week)
	case "gain":
		activityMultiplier = 1.725 // Very active (6-7 days/week)
	default:
		activityMultiplier = 1.55
	}

	// Calculate TDEE (Total Daily Energy Expenditure)
	tdee := bmr * activityMultiplier

	// Adjust calories based on goal
	switch u.Goal {
	case "lose":
		return int(tdee - 500) // 500 calorie deficit for weight loss
	case "gain":
		return int(tdee + 500) // 500 calorie surplus for weight gain
	default:
		return int(tdee) // maintain weight
	}
}

func (u *User) GetStats() UserStats {
	// Calculate daily calories consumed
	var dailyCalories float64
	today := time.Now().Format("2006-01-02")
	var todaysFoodEntries []FoodEntry

	for _, entry := range u.FoodEntries {
		if entry.Date == today {
			dailyCalories += entry.Calories
			todaysFoodEntries = append(todaysFoodEntries, entry)
		}
	}

	// Ensure fat percentage is calculated
	u.CalculateFatPercentage()
	u.CalculateAge()
	stats := UserStats{
		DailyCalories:    dailyCalories,
		NeededCalories:   u.CalculateNeededCalories(),
		CurrentWeight:    u.Weight,
		NeckMeasurement:  u.NeckMeasure,
		WaistMeasurement: u.WaistMeasure,
		HipMeasurement:   u.HipMeasure,
		FatPercentage:    u.FatPercentage,
		Goal:             u.Goal,
		Age:              u.Age,
		FoodEntries:      todaysFoodEntries,
	}

	return stats
}

func (u *User) CalculateAge() int {
	birthDate, err := time.Parse("2006-01-02", u.Birthday)
	if err != nil {
		log.Printf("Error parsing birthday: %v", err)
		return 0
	}

	now := time.Now()
	age := now.Year() - birthDate.Year()

	// Adjust age if birthday hasn't occurred this year
	if now.Month() < birthDate.Month() || (now.Month() == birthDate.Month() && now.Day() < birthDate.Day()) {
		age--
	}
	//log.Printf("Age calculated: %d\n", age)
	//log.Printf("Current time: %v\n", now)
	//log.Printf("Birthday: %v\n", birthDate)

	u.Age = age
	return age
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Goal == "" {
		u.Goal = "maintain"
	}
	u.Age = u.CalculateAge()
	u.FatPercentage = u.CalculateFatPercentage()
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.CalculateAge()
	u.FatPercentage = u.CalculateFatPercentage()
	return nil
}

type Food struct {
	gorm.Model
	Name          string  `json:"name" binding:"required"`
	Calories      int     `json:"calories" binding:"required"`
	Protein       float64 `json:"protein"`
	Carbohydrates float64 `json:"carbohydrates"`
	Fat           float64 `json:"fat"`
	ServingSize   int     `json:"serving_size" binding:"required"` // Base serving size in grams
	Category      string  `json:"category"`                        // Food category
}

type FoodServing struct {
	gorm.Model
	FoodID      uint    `json:"food_id"`
	Description string  `json:"description"` // e.g., "1 tablespoon", "1 medium piece"
	Grams       float64 `json:"grams"`       // Equivalent in grams
}

type FoodEntry struct {
	gorm.Model
	UserID      uint    `json:"user_id"`
	FoodID      uint    `json:"food_id" binding:"required"`
	Food        Food    `json:"food" gorm:"foreignKey:FoodID;references:ID" binding:"-"`
	ServingDesc string  `json:"serving_desc" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required"`
	Date        string  `json:"date" binding:"required"`
	Calories    float64 `json:"calories"`
	FoodSetID   *uint   `json:"food_set_id,omitempty"`
}

type FoodSet struct {
	gorm.Model
	UserID      uint        `json:"user_id"`
	Name        string      `json:"name" binding:"required"`
	Description string      `json:"description"`
	Entries     []FoodEntry `json:"entries" gorm:"foreignKey:FoodSetID"`
}
