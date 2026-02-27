/**
 * API категорий: GET/POST /v1/categories, GET/PATCH/DELETE /v1/categories/:id
 */
import { apiClient } from "./client";
import type {
  Category,
  CreateCategoryBody,
  UpdateCategoryBody,
  DeleteCategoryResponse,
} from "./types";

export async function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>("/categories");
}

export async function getCategory(id: string): Promise<Category> {
  return apiClient<Category>(`/categories/${encodeURIComponent(id)}`);
}

export async function createCategory(
  body: CreateCategoryBody,
): Promise<Category> {
  return apiClient<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCategory(
  id: string,
  body: UpdateCategoryBody,
): Promise<Category> {
  return apiClient<Category>(`/categories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCategory(
  id: string,
): Promise<DeleteCategoryResponse> {
  return apiClient<DeleteCategoryResponse>(
    `/categories/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}
