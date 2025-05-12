import dotenv from "dotenv";
dotenv.config();
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
//
import axios from 'axios';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json()); // <-- This parses JSON bodies

let GATEWAY_PATH = process.env.GATEWAY_CONTEXT_PATH || "/gateway";
let PORT = parseInt(process.env.PORT as string) || 5001;

app.get(`${GATEWAY_PATH}/ping`, (req, res) => {
  res.json({
    status: true,
    message: `Gateway is running on port ${PORT} root path --> ${GATEWAY_PATH}`,
  });
});

async function downloadImage(url: any) {
  const response = await axios({ url, responseType: 'arraybuffer' });
  return PNG.sync.read(response.data);
}

app.post(`${GATEWAY_PATH}/compare`, async (req, res) => {
  const { page_image, figma_image } = req.body;
  const img1 = await downloadImage(page_image);
  const img2 = await downloadImage(figma_image);

  const { width, height } = img1;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
console.log({diffPixels});

  const totalPixels = width * height;
  const diffRatio = diffPixels / totalPixels;
  res.json({ difference: diffRatio, similar: diffRatio < 0.05 });
});


app.use((req: Request, res: Response, next: NextFunction) => {
  console.log({ NOT_FOUND_Error: req });
  const error = new Error("Not Found");
  next(error);
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.log({ Gateway_Error: error });
  res.status(500).json({
    status: false,
    message: error?.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Gateway is running on port ${PORT} root path --> ${GATEWAY_PATH}`);
});
