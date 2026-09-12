const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RUIJIE_BASE = "https://cloud-as.ruijienetworks.com";

// Master Developer Credentials (Postman Verified)
const MASTER_APP_ID = process.env.RUIJIE_APP_ID || "open6dfe7fa50c37";
const MASTER_SECRET = process.env.RUIJIE_SECRET || "5b6df901ce97435ab49b3a5714faf947";
const MASTER_TOKEN = process.env.RUIJIE_TOKEN || "d63dss0a81e4415a889ac5b78fsc904a";

// 1. EMAIL & PASSWORD LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[USER LOGIN] Email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    // Authenticate and fetch Cloud Access Token using Master Developer App
    const response = await axios.post(
      `${RUIJIE_BASE}/service/api/oauth20/client/access_token`,
      {
        appid: MASTER_APP_ID,
        secret: MASTER_SECRET
      },
      {
        params: { token: MASTER_TOKEN },
        headers: { "Content-Type": "application/json" },
        timeout: 15000
      }
    );

    console.log("[RUIJIE TOKEN FETCHED]:", response.data?.code === 0 ? "SUCCESS" : response.data);

    if (response.data && response.data.code === 0) {
      return res.json({
        success: true,
        userToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        userEmail: email,
        message: "Login successful"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: response.data?.msg || "Failed to generate Ruijie session"
      });
    }
  } catch (error) {
    console.error("[LOGIN ERROR]:", error.response?.status, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Ruijie Gateway Connection Failed",
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
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
