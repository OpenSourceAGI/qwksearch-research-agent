import grab from "grab-url";

export async function apiRequest(endpoint: string, options?: any) {
  return await grab(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export const googleDocsApi = {
  getAuthUrl: async (): Promise<string> => {
    const res = await apiRequest('/api/google-docs/auth');
    return res.url;
  },
  exportToGoogleDocs: async (documentId: string, accessToken: string, refreshToken: string): Promise<{ googleDocId: string; url: string }> => {
    return await apiRequest('/api/google-docs/export', {
      method: 'POST',
      body: JSON.stringify({ documentId, accessToken, refreshToken }),
    });
  },
  importFromGoogleDocs: async (googleDocId: string, accessToken: string, refreshToken: string, folderId: string | null): Promise<{ title: string; content: string }> => {
    return await apiRequest('/api/google-docs/import', {
      method: 'POST',
      body: JSON.stringify({ googleDocId, accessToken, refreshToken, folderId }),
    });
  },
  getShareableLink: async (googleDocId: string, accessToken: string, refreshToken: string): Promise<string> => {
    const res = await apiRequest('/api/google-docs/share-link', {
      method: 'POST',
      body: JSON.stringify({ googleDocId, accessToken, refreshToken }),
    });
    return res.link;
  },
  shareWithUser: async (googleDocId: string, email: string, accessToken: string, role: string, refreshToken: string): Promise<void> => {
    await apiRequest('/api/google-docs/share', {
      method: 'POST',
      body: JSON.stringify({ googleDocId, email, accessToken, role, refreshToken }),
    });
  },
};
