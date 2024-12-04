import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './FoodRegister.css';

function FoodRegister() {
  const [foodEntry, setFoodEntry] = useState({
    name: '',
    calories: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFoodEntry(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/food-entries/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: foodEntry.name,
          calories: parseInt(foodEntry.calories),
          quantity: parseInt(foodEntry.quantity),
          date: foodEntry.date
        })
      });

      if (response.ok) {
        setMessage('Food entry registered successfully!');
        // Clear form
        setFoodEntry({
          name: '',
          calories: '',
          quantity: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        const error = await response.json();
        setMessage('Failed to register food: ' + error.error);
      }
    } catch (error) {
      console.error('Error registering food:', error);
      setMessage('Error registering food');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="food-register-container">
      <div className="food-register-header">
        <button className="back-btn" onClick={handleBackToDashboard}>
          Back to Dashboard
        </button>
        <h1>Register Food</h1>
      </div>

      {message && <div className="message">{message}</div>}

      <form onSubmit={handleSubmit} className="food-register-form">
        <div className="form-group">
          <label>Food Name:</label>
          <input
            type="text"
            name="name"
            value={foodEntry.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Calories:</label>
          <input
            type="number"
            name="calories"
            value={foodEntry.calories}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Quantity (g):</label>
          <input
            type="number"
            name="quantity"
            value={foodEntry.quantity}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Date:</label>
          <input
            type="date"
            name="date"
            value={foodEntry.date}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="register-btn">
          Register Food
        </button>
      </form>
    </div>
  );
}

export default FoodRegister; 