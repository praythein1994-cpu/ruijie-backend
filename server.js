const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RUIJIE_REGION_URL = process.env.RUIJIE_URL || "https://cloud-as.ruijienetworks.com";
const userSessions = new Map();

// 1. LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const ruijieAuthRes = await axios.post(`${RUIJIE_REGION_URL}/service/api/auth/user/login`, {
      username: email,
      password: password
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });

    if (ruijieAuthRes.data && ruijieAuthRes.data.code === 0) {
      const userToken = ruijieAuthRes.data.data.token || ruijieAuthRes.data.data.access_token;
      userSessions.set(email, { token: userToken, loginAt: Date.now() });
      return res.json({ success: true, message: "Login successful", userToken });
    } else {
      return res.status(401).json({
        success: false,
        message: ruijieAuthRes.data.msg || "Invalid Ruijie credentials"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Ruijie Gateway Connection Failed",
      details: error.response?.data || error.message
    });
  }
});

// 2. PROJECTS
app.get('/api/projects', async (req, res) => {
  const userToken = req.headers['x-ruijie-token'];
  if (!userToken) return res.status(401).json({ error: "Missing x-ruijie-token" });

  try {
    const response = await axios.post(`${RUIJIE_REGION_URL}/service/api/v1/project/list`, {}, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. DEVICES
app.get('/api/devices', async (req, res) => {
  const userToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.get(`${RUIJIE_REGION_URL}/service/api/maint/devices`, {
      params: { access_token: userToken, projectId },
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. CLIENTS
app.get('/api/clients', async (req, res) => {
  const userToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.post(`${RUIJIE_REGION_URL}/service/api/v1/client/list`, {
      project_id: projectId
    }, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. VOUCHER GENERATE
app.post('/api/vouchers/generate', async (req, res) => {
  const userToken = req.headers['x-ruijie-token'];
  const { projectId, duration, quota } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_REGION_URL}/service/api/v1/auth/voucher/create`, {
      project_id: projectId,
      duration: duration || 60,
      quota: quota || 1
    }, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. VOUCHER DELETE
app.post('/api/vouchers/delete', async (req, res) => {
  const userToken = req.headers['x-ruijie-token'];
  const { projectId, code } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_REGION_URL}/service/api/v1/auth/voucher/delete`, {
      project_id: projectId,
      code: code
    }, {
      headers: { "Authorization": `Bearer ${userToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
