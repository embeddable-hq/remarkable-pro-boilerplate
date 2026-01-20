const http = require("http");

const PORT = 8080;

// Sadly, this has to be a template literal, which breaks syntax highlighting in many editors. Sorry!
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Embeddable SPA</title>
  <script type="module" src="https://api.eu.embeddable.com/js/v1/"></script>
  <style>
    body {
      margin: 0;
      font-family: sans-serif;
    }
    .container {
      display: flex;
      height: 100vh;
    }
    .sidebar {
      width: 350px;
      background: #f5f5f5;
      padding: 30px 30px;
      box-sizing: border-box;
      border-right: 1px solid #ddd;
    }
    .main {
      flex: 1;
      padding: 24px;
      box-sizing: border-box;
      overflow: auto;
    }
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: bold;
    }
    input, select, textarea {
      width: 100%;
      margin-bottom: 14px;
      padding: 6px;
      box-sizing: border-box;
    }
    button {
      padding: 8px 18px;
      font-size: 1rem;
      cursor: pointer;
    }
    .error {
      color: #b00;
      margin-bottom: 10px;
    }
    .tiny {
      font-size: 0.8rem;
      color: #666;
    }
    button, input, optgroup, select, textarea {
      margin-bottom: 10px;
    }
    .optional-fields {
        display: none;
    }
    .optional-fields.visible {
        display: block;
    }
  </style>
  </head>
<body>
  <div class="container">
    <div class="sidebar" style="overflow: auto;">
      <form id="embeddable-form" autocomplete="off">
        <div id="form-error" class="error"></div>

        <h4>Required</h4>
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" name="apiKey" required />

        <label for="embeddableID">Embeddable ID</label>
        <input type="text" id="embeddableID" name="embeddableID" required />

        <label for="region">Region</label>
        <select id="region" name="region" required>
          <option value="us">US</option>
          <option value="eu">EU</option>
        </select>

        <label for="expiryInSeconds">Expiry (seconds)</label>
        <input type="number" id="expiryInSeconds" name="expiryInSeconds" value="604800" required />

        <label for="user">User</label>
        <input type="text" id="user" name="user" required />

        <h4 id="optional-fields-header">Optional <span class="tiny">(click to show/hide)</span></h4>

        <div class="optional-fields" id="optional-fields-container">
          <label for="savedVersion">Saved Version</label>
          <input type="text" id="savedVersion" name="savedVersion" />

          <label for="securityContext">Security Context <span class="tiny">(valid JSON)</span></label>
          <textarea cols="4" id="securityContext" name="securityContext"></textarea>

          <label for="clientContext">Client Context <span class="tiny">(valid JSON)</span></label>
          <textarea cols="4" type="text" id="clientContext" name="clientContext"></textarea>


          <label for="customCanvasState">Custom Canvas State</label>
          <textarea id="customCanvasState" name="customCanvasState"></textarea>

          <label for="customCanvasReadOnly">Custom Canvas ReadOnly</label>
          <select id="customCanvasReadOnly" name="customCanvasReadOnly">
            <option value="">(unset)</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>

          <label for="environment">Environment</label>
          <input type="text" id="environment" name="environment" />

          <label for="roles">Roles (comma separated)</label>
          <input type="text" id="roles" name="roles" />

          <label for="dataProvider">Data Provider</label>
          <input type="text" id="dataProvider" name="dataProvider" />
        </div>

        <button type="submit" style="background-color: #0066ff; color: #ffffff">Load Embeddable</button><br />
        <button type="button" id="clear-storage">Clear Saved Values</button>
      </form>
    </div>
    <div class="main" id="main-content">
      <!-- em-beddable will be injected here -->
    </div>
  </div>
  <script>
    async function getEmbeddableData(formInputs) {
      const {
        apiKey,
        embeddableID,
        region,
        securityContext,
        expiryInSeconds,
        user,
        clientContext
      } = formInputs;

      const url = \`https://api.\${region}.embeddable.com/api/v1/security-token\`;

      const body = {
        embeddableId: embeddableID,
        expiryInSeconds: Number(expiryInSeconds) || 604800,
        securityContext: securityContext ? JSON.parse(securityContext) : {},
        user
      };

      // Optionally add extra fields if present
      if (formInputs.savedVersion) body.savedVersion = formInputs.savedVersion;
      if (formInputs.customCanvasState) body.customCanvasState = formInputs.customCanvasState;
      if (formInputs.customCanvasReadOnly !== undefined && formInputs.customCanvasReadOnly !== "") {
        body.customCanvasReadOnly = formInputs.customCanvasReadOnly === "true";
      }
      if (formInputs.environment) body.environment = formInputs.environment;
      if (formInputs.roles) {
        body.roles = formInputs.roles.split(',').map(r => r.trim()).filter(Boolean);
      }
      if (formInputs.dataProvider) body.dataProvider = formInputs.dataProvider;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        },
        body: JSON.stringify(body)
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.errorMessage || response.statusText);
      }
      return json;
    }
    
    // Helper function to validate JSON strings
    function validateJSON(value, fieldName) {
      if (!value) return null;
      try {
        JSON.parse(value);
        return null;
      } catch (err) {
        return \`\${fieldName} must be valid JSON\`;
      }
    }

    // Stuff to do on form submit
    document.getElementById('embeddable-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const formInputs = {};
      for (const [key, value] of formData.entries()) {
        formInputs[key] = value;
      }
      let clientContext = formInputs.clientContext;
      let securityContext = formInputs.securityContext;
      
      // Validate JSON fields
      const securityError = validateJSON(securityContext, 'Security Context');
      if (securityError) {
        document.getElementById('form-error').textContent = securityError;
        return;
      }
      
      const clientError = validateJSON(clientContext, 'Client Context');
      if (clientError) {
        document.getElementById('form-error').textContent = clientError;
        return;
      }
      
      // Set default for clientContext if empty
      if (!clientContext) {
        clientContext = '{}';
      }
      
      // Save form values to localStorage
      localStorage.setItem('embeddableFormValues', JSON.stringify(formInputs));

      // Handle optional boolean
      if ('customCanvasReadOnly' in formInputs && formInputs.customCanvasReadOnly === "") {
        delete formInputs.customCanvasReadOnly;
      }
      document.getElementById('form-error').textContent = '';
      try {
        const json = await getEmbeddableData(formInputs);
        const region = formInputs.region;
        const main = document.getElementById('main-content');
        main.innerHTML = '';
        const em = document.createElement('em-beddable');
        em.setAttribute('base-url', \`https://api.\${region}.embeddable.com/\`);
        em.setAttribute('token', json.token);
        em.setAttribute('client-context', clientContext);
        main.appendChild(em);
      } catch (err) {
        document.getElementById('form-error').textContent = err.message;
      }
    });

    // Pre-populate form from localStorage on page load
    window.addEventListener('DOMContentLoaded', () => {
      const saved = localStorage.getItem('embeddableFormValues');
      if (saved) {
        const values = JSON.parse(saved);
        Object.entries(values).forEach(([key, value]) => {
          const el = document.getElementById(key);
          if (el) {
            if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.value = value;
            }
          }
        });
      }
      const visible = localStorage.getItem('optionalFieldsVisible');
      const container = document.getElementById('optional-fields-container');
      if (visible === '1') {
        container.classList.add('visible');
      } else {
        container.classList.remove('visible');
      }
    });

    // Clear localStorage and reset form on button click
    document.getElementById('clear-storage').addEventListener('click', () => {
      localStorage.removeItem('embeddableFormValues');
      document.getElementById('embeddable-form').reset();
    });

    // Toggle optional fields visibility and save to localStorage
    document.getElementById('optional-fields-header').addEventListener('click', () => {
      const container = document.getElementById('optional-fields-container');
      const isVisible = container.classList.toggle('visible');
      localStorage.setItem('optionalFieldsVisible', isVisible ? '1' : '0');
    });
  </script>
</body>
</html>
`;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  })
  .listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
