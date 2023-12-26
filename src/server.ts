// import cors from 'cors';
import express from 'express';

import dotenv from 'dotenv';
import handleRequest from './handleRequest.js';
dotenv.config();

const app = express();
// app.use(
//   cors({
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   }),
// );

// TODO: create a 'failed' runresult when we die, especially before calling the model

app.get('*', async (req, res) => {
  handleRequest(req, res);
});

app.post('*', async (req, res) => {
  handleRequest(req, res);
});

// app.options(
//   '*',
//   (req, res, next) => {
//     console.log('options');
//     next();
//   },
//   cors(),
// );

app.listen(2358, () => {
  console.log('Server listening on port 2358');
});
