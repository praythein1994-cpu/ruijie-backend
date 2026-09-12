const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RUIJIE_BASE = "https://cloud-as.ruijienetworks.com";

// 1. OAUTH TOKEN EXCHANGE / LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password, token } = req.body;
  
  // User input can be provided via Token directly or Password field
  const clientToken = token || password || email;
  console.log(`[AUTH REQUEST] Using Token/Key: ${clientToken?.substring(0, 10)}...`);

  if (!clientToken) {
    return res.status(400).json({ success: false, message: "Token or Secret is required" });
  }

  try {
    // Ruijie Official OAuth2 Token Endpoint
    const response = await axios.post(
      `${RUIJIE_BASE}/service/api/oauth20/client/access_token`,
      null,
      {
        params: { token: clientToken },
        timeout: 10000
      }
    );

    console.log("[RUIJIE AUTH SUCCESS]:", response.data);

    if (response.data && response.data.code === 0) {
      return res.json({
        success: true,
        userToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        message: "Logged in successfully"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: response.data?.msg || "Failed to authenticate with Ruijie"
      });
    }
  } catch (error) {
    console.error("[AUTH ROUTE ERROR]:", error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.msg || "Ruijie Gateway Connection Failed",
      details: error.response?.data || error.message
    });
  }
});

// 2. PROJECT LIST
app.get('/api/projects', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  if (!accessToken) return res.status(401).json({ error: "Missing x-ruijie-token" });

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/project/list`, {}, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. HARDWARE DEVICES
app.get('/api/devices', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.get(`${RUIJIE_BASE}/service/api/maint/devices`, {
      params: { access_token: accessToken, projectId },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. CONNECTED CLIENTS
app.get('/api/clients', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId } = req.query;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/client/list`, {
      project_id: projectId
    }, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. VOUCHER GENERATE
app.post('/api/vouchers/generate', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId, duration, quota } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/auth/voucher/create`, {
      project_id: projectId,
      duration: duration || 60,
      quota: quota || 1
    }, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. VOUCHER DELETE
app.post('/api/vouchers/delete', async (req, res) => {
  const accessToken = req.headers['x-ruijie-token'];
  const { projectId, code } = req.body;

  try {
    const response = await axios.post(`${RUIJIE_BASE}/service/api/v1/auth/voucher/delete`, {
      project_id: projectId,
      code: code
    }, {
      params: { access_token: accessToken },
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
