const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const RUIJIE_BASE = "https://cloud-as.ruijienetworks.com";

// 1. DUAL-MODE LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[LOGIN INCOMING] User: ${email}`);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  // A. If user enters Ruijie Cloud Open API Credentials (AppID / Secret)
  try {
    const tokenRes = await axios.post(`${RUIJIE_BASE}/service/api/token/create`, {
      appid: email,
      secret: password
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });

    console.log("[OPEN API RESPONSE]", tokenRes.data);
    if (tokenRes.data && (tokenRes.data.code === 0 || tokenRes.data.accessToken)) {
      return res.json({
        success: true,
        userToken: tokenRes.data.accessToken || tokenRes.data.data?.accessToken,
        type: 'open_api'
      });
    }
  } catch (apiErr) {
    console.log("[OPEN API FAILED, FALLING BACK TO WEB AUTH]");
  }

  // B. Fallback to Ruijie Cloud Web SSO Authentication
  try {
    const webRes = await axios.post(`${RUIJIE_BASE}/sso/login`, new URLSearchParams({
      username: email,
      password: password,
      service: `${RUIJIE_BASE}/service/api/token`
    }), {
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      maxRedirects: 5,
      timeout: 10000
    });

    console.log("[WEB SSO STATUS]:", webRes.status);
    const setCookie = webRes.headers['set-cookie'];
    const sessionToken = setCookie ? setCookie.join('; ') : "active_session";

    return res.json({
      success: true,
      userToken: sessionToken,
      type: 'web_session'
    });
  } catch (webErr) {
    console.error("[AUTH ERROR DETAILS]:", webErr.response?.status, webErr.response?.data || webErr.message);
    return res.status(401).json({
      success: false,
      message: "Invalid Ruijie Credentials or API Key"
    });
  }
});

// 2. PROJECT LIST
app.get('/api/projects', async (req, res) => {
  const token = req.headers['x-ruijie-token'];
  try {
    const response = await axios.get(`${RUIJIE_BASE}/service/api/group/single/tree`, {
      params: { depth: 'BUILDING', access_token: token },
      headers: { Cookie: token }
    });
    res.json({ data: response.data?.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. HARDWARE DEVICES
app.get('/api/devices', async (req, res) => {
  const token = req.headers['x-ruijie-token'];
  const { projectId } = req.query;
  try {
    const response = await axios.get(`${RUIJIE_BASE}/service/api/device/list`, {
      params: { access_token: token, groupId: projectId },
      headers: { Cookie: token }
    });
    res.json({ data: response.data?.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CONNECTED CLIENTS
app.get('/api/clients', async (req, res) => {
  const token = req.headers['x-ruijie-token'];
  const { projectId } = req.query;
  try {
    const response = await axios.get(`${RUIJIE_BASE}/service/api/client/list`, {
      params: { access_token: token, groupId: projectId },
      headers: { Cookie: token }
    });
    res.json({ data: response.data?.data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
