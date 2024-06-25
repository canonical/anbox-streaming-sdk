/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2024 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const yaml = require("yaml");
const compressing = require("compressing");
require("dotenv").config({ path: ".env.local" });

const {
  APP_NAME,
  DEFAULT_ARCH,
  IMAGE_NAME,
  SERVER_PORT,
} = require("./fixtures/constants.cjs");

const app = express();
app.listen(SERVER_PORT);

const amsAgent = new https.Agent({
  cert: fs.readFileSync(process.env.AMS_API_CERTIFICATE),
  key: fs.readFileSync(process.env.AMS_API_CERTIFICATE_KEY),
  rejectUnauthorized: false,
});

const asgAgent = new https.Agent({
  rejectUnauthorized: false,
});

const asgHeaders = {
  Authorization: `macaroon root=${process.env.ASG_API_TOKEN}`,
  "Content-Type": "application/json",
};

const getArch = async () => {
  const response = await axios.get(`${process.env.AMS_API_URL}/1.0/nodes`, {
    httpsAgent: amsAgent,
  });
  const nodes = response.data.metadata;
  if (nodes.length === 0) throw new Error("No nodes found");
  const arch = nodes[0].architecture;
  switch (arch) {
    case "x86_64":
    case "amd64":
      return "amd64";
    case "arm64":
    case "aarch64":
      return "arm64";
    default:
      return DEFAULT_ARCH;
  }
};

app.get("/", function (_req, res) {
  res.sendFile(`${__dirname}/index.html`);
});

app.get("/anbox-stream-sdk.js", function (_req, res) {
  res.sendFile(path.resolve(`${__dirname}/../../anbox-stream-sdk.js`));
});

app.get("/applications", function (_req, res) {
  axios
    .get(`${process.env.AMS_API_URL}/1.0/applications?recursion=1`, {
      httpsAgent: amsAgent,
    })
    .then((response) => {
      res.send(response.data.metadata);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.delete("/application", function (_req, res) {
  axios
    .get(`${process.env.AMS_API_URL}/1.0/applications?recursion=1`, {
      httpsAgent: amsAgent,
    })
    .then((response) => {
      const applications = response.data.metadata;
      const id = applications.find(
        (application) => application.name === APP_NAME,
      ).id;
      if (!id) {
        res.status(404).send("Application not found");
      } else {
        axios
          .delete(`${process.env.AMS_API_URL}/1.0/applications/${id}`, {
            data: { force: false },
            httpsAgent: amsAgent,
          })
          .then((response) => {
            res.send(response.data);
          })
          .catch((error) => {
            res.status(500).send(error);
          });
      }
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.post("/application", async (_req, res) => {
  const manifestJson = {
    name: APP_NAME,
    image: `${IMAGE_NAME}:${await getArch()}`,
    watchdog: {
      disabled: false,
    },
    resources: {
      cpus: 4,
      memory: "3GB",
      "disk-size": "3GB",
    },
  };
  const manifestBuffer = Buffer.from(yaml.stringify(manifestJson));
  const zipStream = new compressing.zip.Stream();
  zipStream.addEntry(manifestBuffer, { relativePath: "manifest.yaml" });
  axios
    .post(`${process.env.AMS_API_URL}/1.0/applications`, zipStream, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
      httpsAgent: amsAgent,
    })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.get("/asgApplications", (_req, res) => {
  axios
    .get(`${process.env.ASG_API_URL}/1.0/applications`, {
      headers: asgHeaders,
      httpsAgent: asgAgent,
    })
    .then((response) => {
      res.send(response.data.metadata);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.get("/sessions", (_req, res) => {
  axios
    .get(`${process.env.ASG_API_URL}/1.0/sessions?recursion=1`, {
      headers: asgHeaders,
      httpsAgent: asgAgent,
    })
    .then((response) => {
      res.send(response.data.metadata);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.delete("/session", (_req, res) => {
  axios
    .get(`${process.env.ASG_API_URL}/1.0/sessions?recursion=1`, {
      headers: asgHeaders,
      httpsAgent: asgAgent,
    })
    .then((response) => {
      const sessions = response.data.metadata;
      const id = sessions.find((session) => session.app === APP_NAME).id;
      if (!id) {
        res.status(404).send("Session not found");
      } else {
        axios
          .delete(`${process.env.ASG_API_URL}/1.0/sessions/${id}`, {
            headers: asgHeaders,
            httpsAgent: asgAgent,
          })
          .then((response) => {
            res.send(response.data);
          })
          .catch((error) => {
            res.status(500).send(error);
          });
      }
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.post("/session", (req, res) => {
  const app = req.query.app;
  const params = {
    app,
    joinable: true,
    screen: {
      width: 1280,
      height: 720,
      fps: 60,
      density: 240,
    },
    idle_time_min: 0,
    app_version: undefined,
  };
  axios
    .post(`${process.env.ASG_API_URL}/1.0/sessions`, params, {
      headers: asgHeaders,
      httpsAgent: asgAgent,
    })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

app.post("/join", (req, res) => {
  const sessionId = req.query.sessionId;
  axios
    .post(
      `${process.env.ASG_API_URL}/1.0/sessions/${sessionId}/join`,
      { disconnect_clients: true },
      {
        headers: asgHeaders,
        httpsAgent: asgAgent,
      },
    )
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});
