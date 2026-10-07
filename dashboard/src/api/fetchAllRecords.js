import axiosInstance from "./axiosInstance";
import { collectAllPages } from "../utils/pagination";

export default function fetchAllRecords(path, collectionKey, params = {}) {
  return collectAllPages(async (pagination) => {
    const { data } = await axiosInstance.get(path, { params: { ...params, ...pagination } });
    return data;
  }, collectionKey);
}
