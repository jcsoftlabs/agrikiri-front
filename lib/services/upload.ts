import api from '../api';

export interface UploadedAsset {
  url: string;
  publicId: string;
}

export const uploadDeliveryProofAsset = async (file: File): Promise<UploadedAsset> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/upload/delivery-proof', formData);
  return data.data;
};
