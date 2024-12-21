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
  const [foodSetMode, setFoodSetMode] = useState(false);
  const [foodSetEntries, setFoodSetEntries] = useState([]);
  const [foodSetName, setFoodSetName] = useState('');
  const [foodSetDescription, setFoodSetDescription] = useState('');
  const [foodSets, setFoodSets] = useState([]);
  const [showFoodSets, setShowFoodSets] = useState(false);

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

    // Add food sets fetch
    const fetchFoodSets = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8080/api/food-sets', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setFoodSets(data);
        }
      } catch (error) {
        console.error('Error fetching food sets:', error);
      }
    };

    fetchFoodSets();

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

  const handleAddToSet = () => {
    if (!selectedFood || !foodEntry.servingDesc || !foodEntry.quantity) {
      setMessage('Please fill all fields before adding to set');
      return;
    }

    const newEntry = {
      food_id: parseInt(foodEntry.foodId),
      serving_desc: foodEntry.servingDesc,
      quantity: parseFloat(foodEntry.quantity)
    };

    setFoodSetEntries([...foodSetEntries, newEntry]);
    
    // Clear the form
    setFoodEntry({
      foodId: '',
      servingDesc: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedFood(null);
    setSearchTerm('');
  };

  const handleCreateFoodSet = async () => {
    if (!foodSetName || foodSetEntries.length === 0) {
      setMessage('Please provide a name and add at least one food entry');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/food-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: foodSetName,
          description: foodSetDescription,
          entries: foodSetEntries
        })
      });

      if (response.ok) {
        setMessage('Food set created successfully!');
        // Clear the form
        setFoodSetName('');
        setFoodSetDescription('');
        setFoodSetEntries([]);
        setFoodSetMode(false);
      } else {
        const error = await response.json();
        setMessage('Failed to create food set: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating food set:', error);
      setMessage('Error creating food set');
    }
  };

  const handleRemoveFromSet = (index) => {
    setFoodSetEntries(foodSetEntries.filter((_, i) => i !== index));
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleApplyFoodSet = async (setId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/food-sets/${setId}/apply?date=${foodEntry.date}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Food set applied successfully!');
        setShowFoodSets(false);
      } else {
        const error = await response.json();
        setMessage('Failed to apply food set: ' + error.error);
      }
    } catch (error) {
      console.error('Error applying food set:', error);
      setMessage('Error applying food set');
    }
  };

  const handleDeleteFoodSet = async (setId) => {
    if (!window.confirm('Are you sure you want to delete this food set?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/food-sets/${setId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            setMessage('Food set deleted successfully!');
            // Update the food sets list by removing the deleted set
            setFoodSets(foodSets.filter(set => set.ID !== setId));
        } else {
            const error = await response.json();
            setMessage('Failed to delete food set: ' + error.error);
        }
    } catch (error) {
        console.error('Error deleting food set:', error);
        setMessage('Error deleting food set');
    }
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

      <div className="mode-toggle">
        <button 
          className={`mode-btn ${!foodSetMode && !showFoodSets ? 'active' : ''}`}
          onClick={() => { setFoodSetMode(false); setShowFoodSets(false); }}
        >
          Single Entry
        </button>
        <button 
          className={`mode-btn ${foodSetMode ? 'active' : ''}`}
          onClick={() => { setFoodSetMode(true); setShowFoodSets(false); }}
        >
          Create Food Set
        </button>
        <button 
          className={`mode-btn ${showFoodSets ? 'active' : ''}`}
          onClick={() => { setFoodSetMode(false); setShowFoodSets(true); }}
        >
          Use Food Set
        </button>
      </div>

      {showFoodSets ? (
        <div className="food-sets-list">
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
          
          {foodSets.length === 0 ? (
            <p className="no-sets">No saved food sets found.</p>
          ) : (
            foodSets.map(set => (
              <div key={set.ID} className="food-set-item">
                <div className="food-set-info">
                  <h3>{set.name}</h3>
                  {set.description && <p>{set.description}</p>}
                  <div className="food-set-preview">
                    {set.entries.map((entry, index) => (
                      <div key={index} className="set-entry-item">
                        {entry.food.name} - {entry.serving_desc} × {entry.quantity}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="food-set-actions">
                    <button 
                        className="apply-set-btn"
                        onClick={() => handleApplyFoodSet(set.ID)}
                    >
                        Apply Set
                    </button>
                    <button 
                        className="delete-set-btn"
                        onClick={() => handleDeleteFoodSet(set.ID)}
                    >
                        Delete Set
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
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

          {foodSetMode ? (
            <>
              <div className="food-set-info">
                <input
                  type="text"
                  placeholder="Food Set Name"
                  value={foodSetName}
                  onChange={(e) => setFoodSetName(e.target.value)}
                  className="food-set-input"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={foodSetDescription}
                  onChange={(e) => setFoodSetDescription(e.target.value)}
                  className="food-set-input"
                />
              </div>

              <button 
                className="add-to-set-btn" 
                onClick={handleAddToSet}
                disabled={!selectedFood || !foodEntry.servingDesc || !foodEntry.quantity}
              >
                Add to Set
              </button>

              {foodSetEntries.length > 0 && (
                <div className="food-set-entries">
                  <h3>Foods in Set</h3>
                  {foodSetEntries.map((entry, index) => (
                    <div key={index} className="food-set-entry">
                      <span>{foods.find(f => f.ID === entry.food_id)?.name}</span>
                      <span>{entry.serving_desc} × {entry.quantity}</span>
                      <button onClick={() => handleRemoveFromSet(index)}>Remove</button>
                    </div>
                  ))}
                  <button 
                    className="create-set-btn"
                    onClick={handleCreateFoodSet}
                  >
                    Create Food Set
                  </button>
                </div>
              )}
            </>
          ) : (
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
          )}

          {!foodSetMode && (
            <button type="submit" className="register-btn">
              Register Food
            </button>
          )}
        </form>
      )}
    </div>
  );
}

export default FoodRegister;