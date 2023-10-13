import axios from "axios";

export const apiHandler = async ({ method, url, data }) => {
  try {
    return await axios({
      method: method,
      url: `http://localhost:4005${url}`,
      data: data,
      params: method === "get" ? data : null,
    });
  } catch (error) {
    console.log(error);
  }
};
