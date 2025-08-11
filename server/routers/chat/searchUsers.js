const express = require('express');
const router = express.Router();
const User = require('../../Models/user');

// Search users by name with fuzzy matching
router.get('/search-users', async (req, res) => {
  const { query, limit = 5 } = req.query;
  
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    // Create case-insensitive regex for fuzzy matching
    const searchRegex = new RegExp(query.trim(), 'i');
    
    // Search for users by name
    const users = await User.find({
      name: { $regex: searchRegex }
    })
    .select('name email userId profile phoneNumber')
    .limit(parseInt(limit));

    // Format the response
    const formattedUsers = users.map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      profile: user.profile || '',
      phoneNumber: user.phoneNumber || ''
    }));

    res.status(200).json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by exact name match
router.get('/get-user-by-name', async (req, res) => {
  const { name } = req.query;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Find user by exact name (case-insensitive)
    const user = await User.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    }).select('name email userId profile phoneNumber');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        profile: user.profile || '',
        phoneNumber: user.phoneNumber || ''
      }
    });

  } catch (error) {
    console.error('Error finding user by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
