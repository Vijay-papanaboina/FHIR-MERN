import express from 'express';

const app = express();
const port = 4000;

app.get('/', (req, res) => {
  res.send('Hello from FHIR Backend!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
