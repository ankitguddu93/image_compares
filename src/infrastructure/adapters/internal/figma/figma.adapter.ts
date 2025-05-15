import axios from "axios";
import qs from "qs";

export async function getFigmaPageDetails(figma_id: string, token: any) {
  try {
    const response = await axios.get(
      "https://api.figma.com/v1/files/" + figma_id,
      {
        headers: {
          "X-FIGMA-TOKEN": token,
        },
      }
    );
    return response?.data?.document;
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function getFigmaPageImageById(
  figma_id: string,
  page_id: string,
  token: any
) {
  try {
    const response = await axios.get(
      "https://api.figma.com/v1/images/" +
        figma_id +
        "?format=png&ids=" +
        page_id,
      {
        headers: {
          "X-FIGMA-TOKEN": token,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw error;
  }
}

  export async function getImageBuffer(
    imageUrl: string
  ) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data, 'binary'); 
    } catch (error: any) {
      throw error;
    }
  }
