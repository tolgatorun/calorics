package main

import (
	"calorics/database"
	"calorics/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	database.Connect()

	// Create Gin router
	r := gin.Default()

	// Routes
	r.POST("/users", handlers.CreateUser)
	r.GET("/users/:id", handlers.GetUser)
	r.POST("/users/:id/entries", handlers.CreateFoodEntry)
	r.GET("/users/:id/entries", handlers.GetUserEntries)

	// Run the server
	r.Run(":8080")
}
