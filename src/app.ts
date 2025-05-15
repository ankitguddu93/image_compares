import dotenv from "dotenv";
dotenv.config();
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import path from 'path';
import { dirname } from 'path';
import puppeteer from "puppeteer";
import { getFigmaPageDetails, getFigmaPageImageById, getImageBuffer } from "./infrastructure/adapters/internal/figma/figma.adapter"
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json()); // <-- This parses JSON bodies

let GATEWAY_PATH = process.env.GATEWAY_CONTEXT_PATH || "/gateway";
let PORT = parseInt(process.env.PORT as string) || 5001;
let IMAGE_BASE_UEL = process.env.IMAGE_BASE_UEL;
app.get(`${GATEWAY_PATH}/ping`, (req, res) => {
  res.json({
    status: true,
    message: `Gateway is running on port ${PORT} root path --> ${GATEWAY_PATH}`,
  });
});

async function compareImages(imgBuffer1:any, imgBuffer2: any) {
  try{
  return new Promise((resolve, reject) => {
    const img1 = PNG.sync.read(imgBuffer1);
    const img2 = PNG.sync.read(imgBuffer2);

    const { width, height } = img1;
    const diff = new PNG({ width, height });

    const diffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    const matchingRatio = (totalPixels - diffPixels) / totalPixels;

    resolve(matchingRatio);
  });
}
catch (error){
throw error
}
}


async function getPageUrlImage(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const fileName = `screenshot-${Date.now()}.png`;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = path.join(__dirname, '..', 'images', fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await page.screenshot({
      path: filePath,
      type: 'png',
      fullPage: true,
    });

    return IMAGE_BASE_UEL + `/images/${fileName}`;
  } catch (error) {
    console.error('Screenshot error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function getFigmaPageImage(figma_file_key : string ,figma_page_name : string, token : string) {
  let pageDetails = await getFigmaPageDetails(figma_file_key, token)
  const result = findNodeByName(pageDetails, figma_page_name);
  let pagePngImage = await getFigmaPageImageById(figma_file_key,result?.id, token)
  let image: any = Object.values(pagePngImage?.images)[0];
  return image
}

function findNodeByName(pageDetails: any, figma_page_name: any) {
  if (pageDetails.children && pageDetails.children.length > 0) {
    for (let child of pageDetails.children) {
      const result = child?.children?.find((item:any)=> item.name === figma_page_name)
      if (result){
        return { id: result.id, name: result.name };
      } 
    }
  }
  return null;
}

app.post(`${GATEWAY_PATH}/compare`, async (request: Request, response: Response) => {
  const { page_url, figma_file_key, figma_page_name ,figma_token } = request.body;
  if (!page_url || !figma_file_key || !figma_page_name || !figma_token ) {
    return response.status(400).send('Missing required fields: "page_url", "figma_file_key", "figma_page_name" ,"figma_token"');
  }
  try {
    let pageImage = await getPageUrlImage(page_url)
    let figmaImage = await getFigmaPageImage(figma_file_key, figma_page_name ,figma_token)
    // response.set("Content-Type", "image/png");
    // const ratio : any = await compareImages(pageBuffer, figmaPageBuffer);
    // console.log(`Matching Ratio: ${(ratio * 100).toFixed(2)}%`);
    //response.send(pageBuffer)
     response.send({
      page_image : pageImage,
      figma_image : figmaImage
     })

  } catch (error: any) {
    console.error("Error taking screenshot:", error);
    response.status(500).send("Failed to take screenshot");
  }
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
  console.log(
    `Gateway is running on port ${PORT} root path --> ${GATEWAY_PATH}`
  );
});
