import 'dotenv/config';
import { createApp } from './app';

const app = createApp();

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Clamy API listening on http://localhost:${port}`);
});
