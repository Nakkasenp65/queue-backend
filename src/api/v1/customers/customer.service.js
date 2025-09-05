import axios from "axios";
import prisma from "../../../lib/prisma.js";
import FormData from "form-data";

const createOrUpdateCustomer = async (payload) => {
  const uploadApiUrl = process.env.UPLOAD_IMAGE_API_URL;

  // data.picture_url
  const downloadedImage = await axios.get(payload.picture_url, {
    responseType: "arraybuffer",
  });

  const imageBuffer = downloadedImage.data;
  const mimeType = downloadedImage.headers["content-type"] || "image/jpeg";
  const filename = `profile.jpg`;

  const formData = new FormData();
  formData.append("myFile", imageBuffer, {
    filename: filename,
    contentType: mimeType,
  });

  formData.append("userId", payload.line_user_id);

  // 4. Post the FormData to your upload API
  const { data } = await axios.post(uploadApiUrl, formData, {
    headers: {
      ...formData.getHeaders(),
    },
  });

  //   {
  //   message: 'File uploaded successfully!',
  //   data: {
  //     fileId: '15V6LkasFydcCJr0LaDqkjo3mESCAtYmv',
  //     fileName: '68b94a4a3eddee8010c6397c_1756983373927_user-upload.jpg',
  //     url: 'https://lh3.googleusercontent.com/d/15V6LkasFydcCJr0LaDqkjo3mESCAtYmv'
  //   }
  // }

  return await prisma.customer.create({
    data: {
      line_user_id: payload.line_user_id,
      line_display_name: payload.line_display_name,
      fullname: payload.fullname,
      phone: payload.phone,
      email: payload.email,
      note: payload.note,
      picture_url: data.data.url,
    },
  });
};

const findCustomers = async (filters) => {
  const whereClause = {};

  if (filters.lineUserId) {
    whereClause.line_user_id = filters.lineUserId;
  }
  if (filters.phone) {
    whereClause.phone = filters.phone;
  }

  return await prisma.customer.findMany({
    where: whereClause,
    include: {
      appointments: true,
    },
  });
};

const findCustomerById = async (id) => {
  return await prisma.customer.findUnique({
    where: { id: id },
  });
};

const findCustomerByLineUserIdWithAppointments = async (lineUserId) => {
  return await prisma.customer.findUnique({
    where: { line_user_id: lineUserId },
    include: {
      appointments: {
        where: {
          status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW", "REJECTED_BY_EMPLOYEE"] },
        },
      },
    },
  });
};

const updateCustomerById = async (id, data) => {
  const existingCustomer = await prisma.customer.findUnique({ where: { id: id } });
  if (!existingCustomer) {
    return null; // Indicate customer not found to the controller
  }

  return await prisma.customer.update({
    where: { id: id },
    data: data,
  });
};

const deleteCustomerById = async (id) => {
  const existingCustomer = await prisma.customer.findUnique({ where: { id: id } });
  if (!existingCustomer) {
    return null; // Indicate customer not found to the controller
  }

  await prisma.customer.delete({
    where: { id: id },
  });
  return { success: true };
};

export default {
  createOrUpdateCustomer,
  findCustomers,
  findCustomerById,
  findCustomerByLineUserIdWithAppointments,
  updateCustomerById,
  deleteCustomerById,
};
