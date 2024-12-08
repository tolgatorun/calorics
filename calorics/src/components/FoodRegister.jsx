import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FoodRegister.css';

function FoodRegister() {
  const [foodEntry, setFoodEntry] = useState({
    foodId: '',
    servingDesc: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/foods', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setFoods(data);
        }
      } catch (error) {
        console.error('Error fetching foods:', error);
        setMessage('Error loading food database');
      }
    };

    fetchFoods();

    // Add click event listener to handle clicking outside of search
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFoodSelect = (food) => {
    setSelectedFood(food);
    setFoodEntry(prev => ({
      ...prev,
      foodId: food.ID.toString(),
      servingDesc: '',
      quantity: ''
    }));
    setSearchTerm(food.name);
    setShowDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (!e.target.value) {
      setSelectedFood(null);
      setFoodEntry(prev => ({
        ...prev,
        foodId: '',
        servingDesc: '',
        quantity: ''
      }));
    }
  };

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
      const response = await fetch('http://localhost:8080/api/food-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          food_id: parseInt(foodEntry.foodId),
          serving_desc: foodEntry.servingDesc,
          quantity: parseFloat(foodEntry.quantity),
          date: foodEntry.date
        })
      });

      if (response.ok) {
        setMessage('Food entry registered successfully!');
        setFoodEntry({
          foodId: '',
          servingDesc: '',
          quantity: '',
          date: new Date().toISOString().split('T')[0]
        });
        setSelectedFood(null);
        setSearchTerm('');
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

  const filteredFoods = searchTerm
    ? foods.filter(food => 
        food.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

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
          <label>Search Food:</label>
          <div className="search-container" ref={searchRef}>
            <input
              type="text"
              placeholder="Start typing to search foods..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              className="search-input"
            />
            {showDropdown && searchTerm && filteredFoods.length > 0 && (
              <div className="search-dropdown">
                {filteredFoods.map(food => (
                  <div
                    key={food.ID}
                    className="search-dropdown-item"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <span className="food-name">{food.name}</span>
                    <span className="food-calories">{food.calories} kcal/100g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedFood && (
          <>
            <div className="form-group">
              <label>Serving Size:</label>
              <select
                name="servingDesc"
                value={foodEntry.servingDesc}
                onChange={handleChange}
                required
              >
                <option value="">Select serving size</option>
                {selectedFood.servings.map(serving => (
                  <option key={serving.ID} value={serving.description}>
                    {serving.description} ({Math.round(serving.grams)}g)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Number of Servings:</label>
              <input
                type="number"
                name="quantity"
                value={foodEntry.quantity}
                onChange={handleChange}
                min="0.25"
                step="0.25"
                required
              />
            </div>

            {foodEntry.servingDesc && foodEntry.quantity && (
              <div className="calories-preview">
                Estimated calories: {Math.round(
                  (selectedFood.calories / 100) * 
                  selectedFood.servings.find(s => s.description === foodEntry.servingDesc).grams * 
                  parseFloat(foodEntry.quantity)
                )} kcal
              </div>
            )}
          </>
        )}

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