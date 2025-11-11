const express = require('express');
const router = express.Router();
const { executeNetworkBlock } = require('../blocks/network');

// Example: Require authentication and authorization middleware
// const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/network/execute
router.post('/execute', 
  // requireAuth, // <-- Uncomment and implement as needed
  // requireRole('admin'), // <-- Uncomment and implement as needed
  async (req, res) => {
    try {
      // Example: check user permissions before executing sensitive block
      // if (!req.user || !req.user.isAdmin) {
      //   return res.status(403).json({ error: 'Forbidden' });
      // }

      const block = req.body.block;
      const result = await executeNetworkBlock(block);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
