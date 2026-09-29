import { api } from "../api";

export const getHello = async () => {
  const { data } = await api.get("/");

  return data;
};

export const createUser = async (payload: { name: string }) => {
  const { data } = await api.post("/users", payload);

  return data;
};
