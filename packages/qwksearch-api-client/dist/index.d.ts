import { Client } from './client';
import { ClientMeta } from './client';
import { Options as Options_2 } from './client';
import { RequestResult } from './client';
import { ServerSentEventsResult } from './client';
import { TDataShape } from './client';

/**
 * Accept a playlist invite
 */
export declare const acceptPlaylistInvite: <ThrowOnError extends boolean = false>(options: Options<AcceptPlaylistInviteData, ThrowOnError>) => RequestResult<AcceptPlaylistInviteResponses, AcceptPlaylistInviteErrors, ThrowOnError>;

export declare type AcceptPlaylistInviteData = {
    body: {
        token: string;
    };
    path?: never;
    query?: never;
    url: '/learn/playlists/accept-invite';
};

export declare type AcceptPlaylistInviteError = AcceptPlaylistInviteErrors[keyof AcceptPlaylistInviteErrors];

export declare type AcceptPlaylistInviteErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type AcceptPlaylistInviteResponse = AcceptPlaylistInviteResponses[keyof AcceptPlaylistInviteResponses];

export declare type AcceptPlaylistInviteResponses = {
    /**
     * Playlist
     */
    200: {
        playlist: Playlist;
    };
};

/**
 * Add a favorite
 */
export declare const addFavorite: <ThrowOnError extends boolean = false>(options: Options<AddFavoriteData, ThrowOnError>) => RequestResult<AddFavoriteResponses, AddFavoriteErrors, ThrowOnError>;

export declare type AddFavoriteData = {
    body: {
        url: string;
        title?: string;
        cite?: string;
        author?: string;
        author_cite?: string;
        date?: string;
        source?: string;
        word_count?: number;
        html?: string;
    };
    path?: never;
    query?: never;
    url: '/doc/favorites';
};

export declare type AddFavoriteError = AddFavoriteErrors[keyof AddFavoriteErrors];

export declare type AddFavoriteErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type AddFavoriteResponse = AddFavoriteResponses[keyof AddFavoriteResponses];

export declare type AddFavoriteResponses = {
    /**
     * Already favorited
     */
    200: {
        message?: string;
        favorite?: Favorite;
    };
    /**
     * Created
     */
    201: {
        message?: string;
        favorite?: Favorite;
    };
};

/**
 * Add an MCP server
 */
export declare const addMcpServer: <ThrowOnError extends boolean = false>(options: Options<AddMcpServerData, ThrowOnError>) => RequestResult<AddMcpServerResponses, unknown, ThrowOnError>;

export declare type AddMcpServerData = {
    body: {
        type: string;
        name: string;
        config: {
            [key: string]: unknown;
        };
    };
    path?: never;
    query?: never;
    url: '/agent/mcpservers';
};

export declare type AddMcpServerResponse = AddMcpServerResponses[keyof AddMcpServerResponses];

export declare type AddMcpServerResponses = {
    /**
     * Created server
     */
    200: {
        server?: McpServer;
    };
};

/**
 * Add a source to a notebook
 */
export declare const addNotebookSource: <ThrowOnError extends boolean = false>(options: Options<AddNotebookSourceData, ThrowOnError>) => RequestResult<AddNotebookSourceResponses, AddNotebookSourceErrors, ThrowOnError>;

export declare type AddNotebookSourceData = {
    body: {
        url?: string;
        text?: string;
        title?: string;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/notebooklm/notebooks/{id}/sources';
};

export declare type AddNotebookSourceError = AddNotebookSourceErrors[keyof AddNotebookSourceErrors];

export declare type AddNotebookSourceErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type AddNotebookSourceResponse = AddNotebookSourceResponses[keyof AddNotebookSourceResponses];

export declare type AddNotebookSourceResponses = {
    /**
     * Source added
     */
    201: {
        source?: NotebookSource;
    };
};

/**
 * Add a provider
 */
export declare const addProvider: <ThrowOnError extends boolean = false>(options: Options<AddProviderData, ThrowOnError>) => RequestResult<AddProviderResponses, unknown, ThrowOnError>;

export declare type AddProviderData = {
    body: {
        type: string;
        config: {
            [key: string]: unknown;
        };
    };
    path?: never;
    query?: never;
    url: '/agent/providers';
};

/**
 * Add a model to a provider
 */
export declare const addProviderModel: <ThrowOnError extends boolean = false>(options: Options<AddProviderModelData, ThrowOnError>) => RequestResult<AddProviderModelResponses, unknown, ThrowOnError>;

export declare type AddProviderModelData = {
    body: {
        key: string;
        name?: string;
        type: 'chat';
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/providers/{id}/models';
};

export declare type AddProviderModelResponse = AddProviderModelResponses[keyof AddProviderModelResponses];

export declare type AddProviderModelResponses = {
    /**
     * Model added
     */
    200: MessageResponse;
};

export declare type AddProviderResponse = AddProviderResponses[keyof AddProviderResponses];

export declare type AddProviderResponses = {
    /**
     * Created provider
     */
    200: {
        provider?: Provider;
    };
};

/**
 * Streaming research chat
 */
export declare const agentChat: <ThrowOnError extends boolean = false>(options: Options<AgentChatData, ThrowOnError, AgentChatResponse>) => Promise<ServerSentEventsResult<AgentChatResponses>>;

export declare type AgentChatData = {
    body: {
        message: {
            messageId: string;
            chatId: string;
            content: string;
        };
        optimizationMode: 'speed' | 'balanced' | 'quality';
        focusMode: string;
        category?: string;
        history?: Array<[
        string,
        string
        ]>;
        files?: Array<string>;
        chatModel: ModelWithProvider;
        sourceExtractionEnabled?: boolean;
        thinkingTimeLimit?: number;
        systemInstructions?: string;
        queryExpansionPrompt?: string;
        queryExpansionEnabled?: boolean;
    };
    path?: never;
    query?: never;
    url: '/agent/chat';
};

export declare type AgentChatError = AgentChatErrors[keyof AgentChatErrors];

export declare type AgentChatErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type AgentChatResponse = AgentChatResponses[keyof AgentChatResponses];

export declare type AgentChatResponses = {
    /**
     * Server-sent events stream
     */
    200: string;
};

/**
 * Meta-search via SearXNG
 */
export declare const agentSearch: <ThrowOnError extends boolean = false>(options: Options<AgentSearchData, ThrowOnError>) => RequestResult<AgentSearchResponses, AgentSearchErrors, ThrowOnError>;

export declare type AgentSearchData = {
    body?: never;
    path?: never;
    query: {
        q: string;
        cat?: 'general' | 'news' | 'images' | 'videos' | 'it' | 'science';
        page?: number;
        lang?: string;
        safesearch?: boolean;
        recency?: 'day' | 'week' | 'month' | 'year';
        publicInstances?: boolean;
    };
    url: '/agent/search';
};

export declare type AgentSearchError = AgentSearchErrors[keyof AgentSearchErrors];

export declare type AgentSearchErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
};

export declare type AgentSearchResponse = AgentSearchResponses[keyof AgentSearchResponses];

export declare type AgentSearchResponses = {
    /**
     * Search results
     */
    200: {
        results?: Array<SearchResult>;
        suggestions?: Array<string>;
        elapsedTime?: number;
    };
};

/**
 * Approve or deny a partner's sign-in request
 *
 * The consent form's submit, same-origin only. Approving issues a two-minute, PKCE-bound code.
 */
export declare const approveConnectRequest: <ThrowOnError extends boolean = false>(options: Options<ApproveConnectRequestData, ThrowOnError>) => RequestResult<unknown, ApproveConnectRequestErrors, ThrowOnError>;

export declare type ApproveConnectRequestData = {
    body: {
        redirect_uri: string;
        state?: string;
        code_challenge: string;
        code_challenge_method?: 'S256';
        decision: 'approve' | 'deny';
    };
    path?: never;
    query?: never;
    url: '/connect/authorize';
};

export declare type ApproveConnectRequestError = ApproveConnectRequestErrors[keyof ApproveConnectRequestErrors];

export declare type ApproveConnectRequestErrors = {
    /**
     * redirect_uri is not an allowlisted partner
     */
    400: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type Article = {
    url?: string;
    title?: string;
    cite?: string;
    author?: string;
    author_cite?: string;
    author_short?: string;
    author_type?: string;
    date?: string;
    source?: string;
    word_count?: number;
    html?: string;
    followUpQuestions?: Array<string>;
    qaHistory?: Array<{
        question?: string;
        answer?: string;
    }>;
};

/**
 * Generate follow-up questions for an article
 */
export declare const articleFollowups: <ThrowOnError extends boolean = false>(options: Options<ArticleFollowupsData, ThrowOnError>) => RequestResult<ArticleFollowupsResponses, ArticleFollowupsErrors, ThrowOnError>;

export declare type ArticleFollowupsData = {
    body: {
        article: string;
        chatHistory?: Array<{
            role?: string;
            content?: string;
        }>;
        maxQuestions?: number;
        provider?: string;
        chatModel?: ModelWithProvider;
    };
    path?: never;
    query?: never;
    url: '/agent/article-followups';
};

export declare type ArticleFollowupsError = ArticleFollowupsErrors[keyof ArticleFollowupsErrors];

export declare type ArticleFollowupsErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ArticleFollowupsResponse = ArticleFollowupsResponses[keyof ArticleFollowupsResponses];

export declare type ArticleFollowupsResponses = {
    /**
     * Follow-up questions
     */
    200: {
        extract?: Array<string>;
        success?: boolean;
    };
};

/**
 * Answer a question grounded in an article
 */
export declare const articleQa: <ThrowOnError extends boolean = false>(options: Options<ArticleQaData, ThrowOnError>) => RequestResult<ArticleQaResponses, ArticleQaErrors, ThrowOnError>;

export declare type ArticleQaData = {
    body: {
        article: string;
        question: string;
        chatHistory?: Array<{
            role?: string;
            content?: string;
        }>;
        provider?: string;
        chatModel?: ModelWithProvider;
    };
    path?: never;
    query?: never;
    url: '/agent/article-qa';
};

export declare type ArticleQaError = ArticleQaErrors[keyof ArticleQaErrors];

export declare type ArticleQaErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ArticleQaResponse = ArticleQaResponses[keyof ArticleQaResponses];

export declare type ArticleQaResponses = {
    /**
     * Answer
     */
    200: {
        content?: string;
        success?: boolean;
    };
};

/**
 * Ask a question against a notebook
 */
export declare const askNotebook: <ThrowOnError extends boolean = false>(options: Options<AskNotebookData, ThrowOnError>) => RequestResult<AskNotebookResponses, AskNotebookErrors, ThrowOnError>;

export declare type AskNotebookData = {
    body: {
        query: string;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/notebooklm/notebooks/{id}/ask';
};

export declare type AskNotebookError = AskNotebookErrors[keyof AskNotebookErrors];

export declare type AskNotebookErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type AskNotebookResponse = AskNotebookResponses[keyof AskNotebookResponses];

export declare type AskNotebookResponses = {
    /**
     * Answer
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Query autocomplete suggestions
 */
export declare const autocomplete: <ThrowOnError extends boolean = false>(options: Options<AutocompleteData, ThrowOnError>) => RequestResult<AutocompleteResponses, unknown, ThrowOnError>;

export declare type AutocompleteData = {
    body?: never;
    path?: never;
    query: {
        q: string;
        locale?: string;
        /**
         * Suggest engine to use (google, bing, duckduckgo/ddg, wikipedia, brave, …). Only the first of a comma-separated list is asked; omit for the server's benchmarked default.
         */
        backends?: string;
        limit?: number;
    };
    url: '/agent/autocomplete';
};

export declare type AutocompleteResponse = AutocompleteResponses[keyof AutocompleteResponses];

export declare type AutocompleteResponses = {
    /**
     * Autocomplete results
     */
    200: {
        suggestions?: Array<string>;
        domains?: Array<DomainSuggestion>;
    };
};

/**
 * Change password
 */
export declare const changePassword: <ThrowOnError extends boolean = false>(options: Options<ChangePasswordData, ThrowOnError>) => RequestResult<ChangePasswordResponses, ChangePasswordErrors, ThrowOnError>;

export declare type ChangePasswordData = {
    body: {
        currentPassword: string;
        newPassword: string;
    };
    path?: never;
    query?: never;
    url: '/user/password';
};

export declare type ChangePasswordError = ChangePasswordErrors[keyof ChangePasswordErrors];

export declare type ChangePasswordErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ChangePasswordResponse = ChangePasswordResponses[keyof ChangePasswordResponses];

export declare type ChangePasswordResponses = {
    /**
     * Changed
     */
    200: MessageResponse;
};

export declare type Chat = {
    id?: string;
    title?: string;
    createdAt?: string;
    focusMode?: string;
    userId?: string;
    files?: Array<string>;
    messageCount?: number;
};

/**
 * Empty the news archive
 */
export declare const clearAdminNews: <ThrowOnError extends boolean = false>(options?: Options<ClearAdminNewsData, ThrowOnError>) => RequestResult<ClearAdminNewsResponses, ClearAdminNewsErrors, ThrowOnError>;

export declare type ClearAdminNewsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/admin/news';
};

export declare type ClearAdminNewsError = ClearAdminNewsErrors[keyof ClearAdminNewsErrors];

export declare type ClearAdminNewsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ClearAdminNewsResponse = ClearAdminNewsResponses[keyof ClearAdminNewsResponses];

export declare type ClearAdminNewsResponses = {
    /**
     * Deleted count and stats
     */
    200: {
        deleted?: number;
        stats?: {
            [key: string]: unknown;
        };
    };
};

export declare type ClientLocation = {
    ip: string | null;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    source: 'edge' | 'ipapi' | 'none';
};

export declare type ClientOptions = {
    baseUrl: 'https://qwksearch.com/api' | `${string}://${string}/api` | (string & {});
};

export declare type ConnectUser = {
    id: string;
    name: string;
    email: string;
    image: string | null;
};

/**
 * Create a document
 */
export declare const createDocument: <ThrowOnError extends boolean = false>(options: Options<CreateDocumentData, ThrowOnError>) => RequestResult<CreateDocumentResponses, unknown, ThrowOnError>;

export declare type CreateDocumentData = {
    body: {
        name?: string;
        title?: string;
        content?: string;
        parentId?: number;
        isFolder?: boolean;
        metadata?: {
            [key: string]: unknown;
        };
        tags?: Array<string>;
    };
    path?: never;
    query?: never;
    url: '/doc/documents';
};

export declare type CreateDocumentResponse = CreateDocumentResponses[keyof CreateDocumentResponses];

export declare type CreateDocumentResponses = {
    /**
     * Created document
     */
    201: Document_2;
};

/**
 * Save a memory
 */
export declare const createMemory: <ThrowOnError extends boolean = false>(options: Options<CreateMemoryData, ThrowOnError>) => RequestResult<CreateMemoryResponses, CreateMemoryErrors, ThrowOnError>;

export declare type CreateMemoryData = {
    body: {
        name: string;
        type: 'user' | 'feedback' | 'project' | 'reference' | 'conversation';
        description?: string;
        content: string;
        importance?: number;
        tags?: Array<string>;
        metadata?: {
            [key: string]: unknown;
        };
    };
    path?: never;
    query?: never;
    url: '/user/memories';
};

export declare type CreateMemoryError = CreateMemoryErrors[keyof CreateMemoryErrors];

export declare type CreateMemoryErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type CreateMemoryResponse = CreateMemoryResponses[keyof CreateMemoryResponses];

export declare type CreateMemoryResponses = {
    /**
     * Created
     */
    201: {
        id?: string;
        message?: string;
    };
};

/**
 * Create a notebook
 */
export declare const createNotebook: <ThrowOnError extends boolean = false>(options: Options<CreateNotebookData, ThrowOnError>) => RequestResult<CreateNotebookResponses, CreateNotebookErrors, ThrowOnError>;

export declare type CreateNotebookData = {
    body: {
        title: string;
    };
    path?: never;
    query?: never;
    url: '/notebooklm/notebooks';
};

export declare type CreateNotebookError = CreateNotebookErrors[keyof CreateNotebookErrors];

export declare type CreateNotebookErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type CreateNotebookResponse = CreateNotebookResponses[keyof CreateNotebookResponses];

export declare type CreateNotebookResponses = {
    /**
     * Created notebook
     */
    201: {
        notebook?: Notebook;
    };
};

/**
 * Create a quote
 */
export declare const createQuote: <ThrowOnError extends boolean = false>(options: Options<CreateQuoteData, ThrowOnError>) => RequestResult<CreateQuoteResponses, unknown, ThrowOnError>;

export declare type CreateQuoteData = {
    body: {
        documentId: string;
        text: string;
        source?: string;
        author?: string;
        url?: string;
        pageNumber?: number;
        tags?: Array<string>;
    };
    path?: never;
    query?: never;
    url: '/doc/quotes';
};

export declare type CreateQuoteResponse = CreateQuoteResponses[keyof CreateQuoteResponses];

export declare type CreateQuoteResponses = {
    /**
     * Created
     */
    201: {
        success?: boolean;
        data?: Quote;
    };
};

/**
 * Transcribe audio (OpenAI-compatible)
 *
 * OpenAI-compatible: point a client's base URL at `https://qwksearch.com/api/v1`. Always requires a QwkSearch API key in a header (`Authorization: Bearer` or `X-API-Key`); a query-string key or a session cookie is rejected. Same Whisper tiers as `/agent/transcript`.
 */
export declare const createTranscription: <ThrowOnError extends boolean = false>(options: Options<CreateTranscriptionData, ThrowOnError>) => RequestResult<CreateTranscriptionResponses, CreateTranscriptionErrors, ThrowOnError>;

export declare type CreateTranscriptionData = {
    body: {
        file: Blob | File;
        model?: 'small' | 'fast' | 'medium' | 'turbo' | 'large';
        response_format?: 'json';
    };
    path?: never;
    query?: never;
    url: '/v1/audio/transcriptions';
};

export declare type CreateTranscriptionError = CreateTranscriptionErrors[keyof CreateTranscriptionErrors];

export declare type CreateTranscriptionErrors = {
    /**
     * Missing or empty file, unknown model, unsupported response_format, or a non-multipart body
     */
    400: OpenAiError;
    /**
     * Missing or invalid API key
     */
    401: OpenAiError;
    /**
     * Transcription failed
     */
    500: OpenAiError;
    /**
     * Key store or Workers AI unavailable
     */
    503: OpenAiError;
};

export declare type CreateTranscriptionResponse = CreateTranscriptionResponses[keyof CreateTranscriptionResponses];

export declare type CreateTranscriptionResponses = {
    /**
     * Transcript
     */
    200: {
        text: string;
    };
};

/**
 * Delete a row
 */
export declare const deleteAdminTableRow: <ThrowOnError extends boolean = false>(options: Options<DeleteAdminTableRowData, ThrowOnError>) => RequestResult<DeleteAdminTableRowResponses, DeleteAdminTableRowErrors, ThrowOnError>;

export declare type DeleteAdminTableRowData = {
    body?: never;
    path: {
        table: string;
        id: string;
    };
    query?: never;
    url: '/admin/database/{table}/{id}';
};

export declare type DeleteAdminTableRowError = DeleteAdminTableRowErrors[keyof DeleteAdminTableRowErrors];

export declare type DeleteAdminTableRowErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeleteAdminTableRowResponse = DeleteAdminTableRowResponses[keyof DeleteAdminTableRowResponses];

export declare type DeleteAdminTableRowResponses = {
    /**
     * Deleted
     */
    200: {
        ok?: boolean;
        row?: {
            [key: string]: unknown;
        };
    };
};

/**
 * Delete a user
 */
export declare const deleteAdminUser: <ThrowOnError extends boolean = false>(options: Options<DeleteAdminUserData, ThrowOnError>) => RequestResult<DeleteAdminUserResponses, DeleteAdminUserErrors, ThrowOnError>;

export declare type DeleteAdminUserData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/admin/users/{id}';
};

export declare type DeleteAdminUserError = DeleteAdminUserErrors[keyof DeleteAdminUserErrors];

export declare type DeleteAdminUserErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeleteAdminUserResponse = DeleteAdminUserResponses[keyof DeleteAdminUserResponses];

export declare type DeleteAdminUserResponses = {
    /**
     * Deleted
     */
    200: {
        ok?: boolean;
    };
};

/**
 * Delete all user chats
 */
export declare const deleteAllChats: <ThrowOnError extends boolean = false>(options?: Options<DeleteAllChatsData, ThrowOnError>) => RequestResult<DeleteAllChatsResponses, DeleteAllChatsErrors, ThrowOnError>;

export declare type DeleteAllChatsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/agent/chats';
};

export declare type DeleteAllChatsError = DeleteAllChatsErrors[keyof DeleteAllChatsErrors];

export declare type DeleteAllChatsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type DeleteAllChatsResponse = DeleteAllChatsResponses[keyof DeleteAllChatsResponses];

export declare type DeleteAllChatsResponses = {
    /**
     * All chats deleted
     */
    200: MessageResponse;
};

/**
 * Delete a chat
 */
export declare const deleteChatById: <ThrowOnError extends boolean = false>(options: Options<DeleteChatByIdData, ThrowOnError>) => RequestResult<DeleteChatByIdResponses, DeleteChatByIdErrors, ThrowOnError>;

export declare type DeleteChatByIdData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/chats/{id}';
};

export declare type DeleteChatByIdError = DeleteChatByIdErrors[keyof DeleteChatByIdErrors];

export declare type DeleteChatByIdErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeleteChatByIdResponse = DeleteChatByIdResponses[keyof DeleteChatByIdResponses];

export declare type DeleteChatByIdResponses = {
    /**
     * Deleted
     */
    200: MessageResponse;
};

/**
 * Delete a document
 */
export declare const deleteDocument: <ThrowOnError extends boolean = false>(options: Options<DeleteDocumentData, ThrowOnError>) => RequestResult<DeleteDocumentResponses, DeleteDocumentErrors, ThrowOnError>;

export declare type DeleteDocumentData = {
    body?: never;
    path: {
        id: number;
    };
    query?: never;
    url: '/doc/documents/{id}';
};

export declare type DeleteDocumentError = DeleteDocumentErrors[keyof DeleteDocumentErrors];

export declare type DeleteDocumentErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeleteDocumentResponse = DeleteDocumentResponses[keyof DeleteDocumentResponses];

export declare type DeleteDocumentResponses = {
    /**
     * Deleted
     */
    200: {
        success?: boolean;
    };
};

/**
 * Delete an MCP server
 */
export declare const deleteMcpServer: <ThrowOnError extends boolean = false>(options: Options<DeleteMcpServerData, ThrowOnError>) => RequestResult<DeleteMcpServerResponses, unknown, ThrowOnError>;

export declare type DeleteMcpServerData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/mcpservers/{id}';
};

export declare type DeleteMcpServerResponse = DeleteMcpServerResponses[keyof DeleteMcpServerResponses];

export declare type DeleteMcpServerResponses = {
    /**
     * Deleted
     */
    200: MessageResponse;
};

/**
 * Delete a memory
 */
export declare const deleteMemory: <ThrowOnError extends boolean = false>(options: Options<DeleteMemoryData, ThrowOnError>) => RequestResult<DeleteMemoryResponses, DeleteMemoryErrors, ThrowOnError>;

export declare type DeleteMemoryData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/user/memories/{id}';
};

export declare type DeleteMemoryError = DeleteMemoryErrors[keyof DeleteMemoryErrors];

export declare type DeleteMemoryErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeleteMemoryResponse = DeleteMemoryResponses[keyof DeleteMemoryResponses];

export declare type DeleteMemoryResponses = {
    /**
     * Done
     */
    200: MessageResponse;
};

/**
 * Delete a notebook
 */
export declare const deleteNotebook: <ThrowOnError extends boolean = false>(options: Options<DeleteNotebookData, ThrowOnError>) => RequestResult<DeleteNotebookResponses, DeleteNotebookErrors, ThrowOnError>;

export declare type DeleteNotebookData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/notebooklm/notebooks/{id}';
};

export declare type DeleteNotebookError = DeleteNotebookErrors[keyof DeleteNotebookErrors];

export declare type DeleteNotebookErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type DeleteNotebookResponse = DeleteNotebookResponses[keyof DeleteNotebookResponses];

export declare type DeleteNotebookResponses = {
    /**
     * Deleted
     */
    200: {
        success?: boolean;
    };
};

/**
 * Delete a playlist
 *
 * Owner only.
 */
export declare const deletePlaylist: <ThrowOnError extends boolean = false>(options: Options<DeletePlaylistData, ThrowOnError>) => RequestResult<DeletePlaylistResponses, DeletePlaylistErrors, ThrowOnError>;

export declare type DeletePlaylistData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/learn/playlists/{id}';
};

export declare type DeletePlaylistError = DeletePlaylistErrors[keyof DeletePlaylistErrors];

export declare type DeletePlaylistErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type DeletePlaylistResponse = DeletePlaylistResponses[keyof DeletePlaylistResponses];

export declare type DeletePlaylistResponses = {
    /**
     * Deleted
     */
    200: {
        ok?: boolean;
    };
};

/**
 * Delete a provider
 */
export declare const deleteProvider: <ThrowOnError extends boolean = false>(options: Options<DeleteProviderData, ThrowOnError>) => RequestResult<DeleteProviderResponses, unknown, ThrowOnError>;

export declare type DeleteProviderData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/providers/{id}';
};

/**
 * Remove a model from a provider
 */
export declare const deleteProviderModel: <ThrowOnError extends boolean = false>(options: Options<DeleteProviderModelData, ThrowOnError>) => RequestResult<DeleteProviderModelResponses, unknown, ThrowOnError>;

export declare type DeleteProviderModelData = {
    body: {
        key: string;
        type: 'chat';
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/providers/{id}/models';
};

export declare type DeleteProviderModelResponse = DeleteProviderModelResponses[keyof DeleteProviderModelResponses];

export declare type DeleteProviderModelResponses = {
    /**
     * Model removed
     */
    200: MessageResponse;
};

export declare type DeleteProviderResponse = DeleteProviderResponses[keyof DeleteProviderResponses];

export declare type DeleteProviderResponses = {
    /**
     * Deleted
     */
    200: MessageResponse;
};

/**
 * Delete a quote
 */
export declare const deleteQuote: <ThrowOnError extends boolean = false>(options: Options<DeleteQuoteData, ThrowOnError>) => RequestResult<DeleteQuoteResponses, unknown, ThrowOnError>;

export declare type DeleteQuoteData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/doc/quotes/{id}';
};

export declare type DeleteQuoteResponse = DeleteQuoteResponses[keyof DeleteQuoteResponses];

export declare type DeleteQuoteResponses = {
    /**
     * Deleted
     */
    200: {
        success?: boolean;
        data?: {
            id?: string;
        };
    };
};

/**
 * Delete an uploaded file from R2
 */
export declare const deleteUploadedFile: <ThrowOnError extends boolean = false>(options: Options<DeleteUploadedFileData, ThrowOnError>) => RequestResult<DeleteUploadedFileResponses, unknown, ThrowOnError>;

export declare type DeleteUploadedFileData = {
    body?: never;
    path?: never;
    query: {
        fileId: string;
        ext?: string;
        sizeBytes?: number;
    };
    url: '/doc/uploads';
};

export declare type DeleteUploadedFileResponse = DeleteUploadedFileResponses[keyof DeleteUploadedFileResponses];

export declare type DeleteUploadedFileResponses = {
    /**
     * Deleted
     */
    200: {
        success?: boolean;
        fileId?: string;
        deleted?: Array<{
            key?: string;
            success?: boolean;
        }>;
    };
};

/**
 * Delete account
 */
export declare const deleteUser: <ThrowOnError extends boolean = false>(options?: Options<DeleteUserData, ThrowOnError>) => RequestResult<DeleteUserResponses, DeleteUserErrors, ThrowOnError>;

/**
 * Unlink an OAuth account
 */
export declare const deleteUserAccount: <ThrowOnError extends boolean = false>(options: Options<DeleteUserAccountData, ThrowOnError>) => RequestResult<DeleteUserAccountResponses, DeleteUserAccountErrors, ThrowOnError>;

export declare type DeleteUserAccountData = {
    body: {
        accountId: string;
    };
    path?: never;
    query?: never;
    url: '/user/accounts';
};

export declare type DeleteUserAccountError = DeleteUserAccountErrors[keyof DeleteUserAccountErrors];

export declare type DeleteUserAccountErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type DeleteUserAccountResponse = DeleteUserAccountResponses[keyof DeleteUserAccountResponses];

export declare type DeleteUserAccountResponses = {
    /**
     * Unlinked
     */
    200: {
        success?: boolean;
    };
};

export declare type DeleteUserData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user';
};

export declare type DeleteUserError = DeleteUserErrors[keyof DeleteUserErrors];

export declare type DeleteUserErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type DeleteUserResponse = DeleteUserResponses[keyof DeleteUserResponses];

export declare type DeleteUserResponses = {
    /**
     * Deleted
     */
    200: MessageResponse;
};

/**
 * Describe a pending "Sign in with QwkSearch" request
 */
export declare const describeConnectRequest: <ThrowOnError extends boolean = false>(options: Options<DescribeConnectRequestData, ThrowOnError>) => RequestResult<DescribeConnectRequestResponses, DescribeConnectRequestErrors, ThrowOnError>;

export declare type DescribeConnectRequestData = {
    body?: never;
    path?: never;
    query: {
        redirect_uri: string;
    };
    url: '/connect/authorize';
};

export declare type DescribeConnectRequestError = DescribeConnectRequestErrors[keyof DescribeConnectRequestErrors];

export declare type DescribeConnectRequestErrors = {
    /**
     * redirect_uri is not an allowlisted partner
     */
    400: ErrorResponse;
};

export declare type DescribeConnectRequestResponse = DescribeConnectRequestResponses[keyof DescribeConnectRequestResponses];

export declare type DescribeConnectRequestResponses = {
    /**
     * Partner and current user
     */
    200: {
        client?: {
            [key: string]: unknown;
        };
        user?: {
            name?: string;
            email?: string;
            image?: string | null;
        } | null;
    };
};

/**
 * Diagnose free-model providers and auth config
 *
 * Which provider keys are visible, the provider list guests receive, a live test per provider, and auth diagnostics.
 */
export declare const diagnoseFreeModels: <ThrowOnError extends boolean = false>(options?: Options<DiagnoseFreeModelsData, ThrowOnError>) => RequestResult<DiagnoseFreeModelsResponses, DiagnoseFreeModelsErrors, ThrowOnError>;

export declare type DiagnoseFreeModelsData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * Live-test every free model for these providers.
         */
        testAll?: 'nvidia' | 'openrouter' | 'anyapi' | 'all';
    };
    url: '/admin/freekeys';
};

export declare type DiagnoseFreeModelsError = DiagnoseFreeModelsErrors[keyof DiagnoseFreeModelsErrors];

export declare type DiagnoseFreeModelsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type DiagnoseFreeModelsResponse = DiagnoseFreeModelsResponses[keyof DiagnoseFreeModelsResponses];

export declare type DiagnoseFreeModelsResponses = {
    /**
     * Diagnostics
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Disconnect NotebookLM
 */
export declare const disconnectNotebooklm: <ThrowOnError extends boolean = false>(options?: Options<DisconnectNotebooklmData, ThrowOnError>) => RequestResult<DisconnectNotebooklmResponses, DisconnectNotebooklmErrors, ThrowOnError>;

export declare type DisconnectNotebooklmData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/notebooklm/status';
};

export declare type DisconnectNotebooklmError = DisconnectNotebooklmErrors[keyof DisconnectNotebooklmErrors];

export declare type DisconnectNotebooklmErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type DisconnectNotebooklmResponse = DisconnectNotebooklmResponses[keyof DisconnectNotebooklmResponses];

export declare type DisconnectNotebooklmResponses = {
    /**
     * Disconnected
     */
    200: {
        success?: boolean;
        message?: string;
    };
};

/**
 * Discover curated content by topic
 */
export declare const discoverContent: <ThrowOnError extends boolean = false>(options?: Options<DiscoverContentData, ThrowOnError>) => RequestResult<DiscoverContentResponses, DiscoverContentErrors, ThrowOnError>;

export declare type DiscoverContentData = {
    body?: never;
    path?: never;
    query?: {
        topic?: 'tech' | 'finance' | 'art' | 'sports' | 'entertainment';
        mode?: 'normal' | 'preview';
    };
    url: '/agent/discover';
};

export declare type DiscoverContentError = DiscoverContentErrors[keyof DiscoverContentErrors];

export declare type DiscoverContentErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type DiscoverContentResponse = DiscoverContentResponses[keyof DiscoverContentResponses];

export declare type DiscoverContentResponses = {
    /**
     * Discovered content
     */
    200: {
        blogs?: Array<SearchResult>;
    };
};

declare type Document_2 = {
    id?: number;
    title?: string;
    name?: string;
    content?: string;
    parentId?: number;
    isFolder?: boolean;
    isExpanded?: boolean;
    metadata?: {
        [key: string]: unknown;
    };
    tags?: Array<string>;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
};
export { Document_2 as Document }

export declare type DomainSuggestion = {
    domain?: string;
    name?: string;
    favicon?: string;
    rank?: number;
};

/**
 * One Google Drive file or folder.
 */
export declare type DriveItem = {
    id: string;
    name: string;
    mimeType: string;
    parents?: Array<string>;
    modifiedTime?: string;
    /**
     * Bytes, as Drive reports it (a string).
     */
    size?: string;
    webViewLink?: string;
};

export declare type ErrorResponse = {
    error?: string;
    message?: string;
};

/**
 * Exchange a sign-in code for the user's API key
 *
 * Server-to-server, called by the partner with the code, the same `redirect_uri` and its PKCE `code_verifier`. Accepts JSON or a form body.
 */
export declare const exchangeConnectCode: <ThrowOnError extends boolean = false>(options: Options<ExchangeConnectCodeData, ThrowOnError>) => RequestResult<ExchangeConnectCodeResponses, ExchangeConnectCodeErrors, ThrowOnError>;

export declare type ExchangeConnectCodeData = {
    body: {
        code: string;
        redirect_uri: string;
        code_verifier: string;
    };
    path?: never;
    query?: never;
    url: '/connect/token';
};

export declare type ExchangeConnectCodeError = ExchangeConnectCodeErrors[keyof ExchangeConnectCodeErrors];

export declare type ExchangeConnectCodeErrors = {
    /**
     * OAuth-style error (`invalid_grant`, `invalid_request`, …)
     */
    400: {
        error?: string;
    };
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ExchangeConnectCodeResponse = ExchangeConnectCodeResponses[keyof ExchangeConnectCodeResponses];

export declare type ExchangeConnectCodeResponses = {
    /**
     * Linked account
     */
    200: {
        token_type: 'api_key';
        api_key: string;
        user: ConnectUser;
        /**
         * Lower-case plan key, e.g. `free`, `pro`.
         */
        plan: string;
        /**
         * Payment link for the next plan; null when already paid.
         */
        upgrade_url?: string | null;
    };
};

/**
 * Export document to Google Docs
 */
export declare const exportToGoogleDocs: <ThrowOnError extends boolean = false>(options: Options<ExportToGoogleDocsData, ThrowOnError>) => RequestResult<ExportToGoogleDocsResponses, unknown, ThrowOnError>;

export declare type ExportToGoogleDocsData = {
    body: {
        documentId: string;
        accessToken: string;
        refreshToken?: string;
    };
    path?: never;
    query?: never;
    url: '/doc/google-docs/export';
};

export declare type ExportToGoogleDocsResponse = ExportToGoogleDocsResponses[keyof ExportToGoogleDocsResponses];

export declare type ExportToGoogleDocsResponses = {
    /**
     * Export result
     */
    200: {
        [key: string]: unknown;
    };
};

export declare type Favorite = {
    id?: number;
    userId?: string;
    url?: string;
    title?: string;
    cite?: string;
    author?: string;
    author_cite?: string;
    date?: string;
    source?: string;
    word_count?: number;
    html?: string;
    createdAt?: string;
};

export declare type FollowUpQuestion = {
    id: string;
    question: string;
    /**
     * Quick answers; free text is also accepted.
     */
    options: Array<string>;
};

/**
 * Generate a title for a conversation
 *
 * Generates a short LLM title from the chat history. When the caller is signed in (or sends their API key) and owns `chatId`, the title is also saved to the chat; it is always returned so guests can store it locally.
 */
export declare const generateChatTitle: <ThrowOnError extends boolean = false>(options: Options<GenerateChatTitleData, ThrowOnError>) => RequestResult<GenerateChatTitleResponses, GenerateChatTitleErrors, ThrowOnError>;

export declare type GenerateChatTitleData = {
    body: {
        chatId?: string;
        /**
         * Messages so far.
         */
        chatHistory: Array<{
            [key: string]: unknown;
        }>;
        chatModel: ModelWithProvider;
    };
    path?: never;
    query?: never;
    url: '/agent/chat-title';
};

export declare type GenerateChatTitleError = GenerateChatTitleErrors[keyof GenerateChatTitleErrors];

export declare type GenerateChatTitleErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GenerateChatTitleResponse = GenerateChatTitleResponses[keyof GenerateChatTitleResponses];

export declare type GenerateChatTitleResponses = {
    /**
     * Title
     */
    200: {
        title: string;
    };
};

/**
 * Generate audio overview for a notebook
 */
export declare const generateNotebookAudio: <ThrowOnError extends boolean = false>(options: Options<GenerateNotebookAudioData, ThrowOnError>) => RequestResult<GenerateNotebookAudioResponses, GenerateNotebookAudioErrors, ThrowOnError>;

export declare type GenerateNotebookAudioData = {
    body?: {
        instructions?: string;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/notebooklm/notebooks/{id}/audio';
};

export declare type GenerateNotebookAudioError = GenerateNotebookAudioErrors[keyof GenerateNotebookAudioErrors];

export declare type GenerateNotebookAudioErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type GenerateNotebookAudioResponse = GenerateNotebookAudioResponses[keyof GenerateNotebookAudioResponses];

export declare type GenerateNotebookAudioResponses = {
    /**
     * Audio result
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Generate short tips about a page
 */
export declare const generatePageTips: <ThrowOnError extends boolean = false>(options: Options<GeneratePageTipsData, ThrowOnError>) => RequestResult<GeneratePageTipsResponses, GeneratePageTipsErrors, ThrowOnError>;

export declare type GeneratePageTipsData = {
    body: {
        title?: string;
        /**
         * Page text; the first 15,000 characters are used.
         */
        content: string;
        /**
         * How many tips to return.
         */
        maxTips?: number;
        chatModel?: ModelWithProvider;
    };
    path?: never;
    query?: never;
    url: '/agent/page-tips';
};

export declare type GeneratePageTipsError = GeneratePageTipsErrors[keyof GeneratePageTipsErrors];

export declare type GeneratePageTipsErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GeneratePageTipsResponse = GeneratePageTipsResponses[keyof GeneratePageTipsResponses];

export declare type GeneratePageTipsResponses = {
    /**
     * Tips
     */
    200: {
        tips: Array<string>;
        success: boolean;
    };
};

/**
 * Generate follow-up suggestions for a chat
 */
export declare const generateSuggestions: <ThrowOnError extends boolean = false>(options: Options<GenerateSuggestionsData, ThrowOnError>) => RequestResult<GenerateSuggestionsResponses, GenerateSuggestionsErrors, ThrowOnError>;

export declare type GenerateSuggestionsData = {
    body: {
        chatHistory: Array<{
            [key: string]: unknown;
        }>;
        chatModel: ModelWithProvider;
        maxQuestions?: number;
        promptTemplate?: string;
    };
    path?: never;
    query?: never;
    url: '/agent/suggestions';
};

export declare type GenerateSuggestionsError = GenerateSuggestionsErrors[keyof GenerateSuggestionsErrors];

export declare type GenerateSuggestionsErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GenerateSuggestionsResponse = GenerateSuggestionsResponses[keyof GenerateSuggestionsResponses];

export declare type GenerateSuggestionsResponses = {
    /**
     * Suggestions
     */
    200: {
        suggestions?: Array<string>;
    };
};

/**
 * Suggest related searches for a page
 */
export declare const generateTopicSearches: <ThrowOnError extends boolean = false>(options: Options<GenerateTopicSearchesData, ThrowOnError>) => RequestResult<GenerateTopicSearchesResponses, GenerateTopicSearchesErrors, ThrowOnError>;

export declare type GenerateTopicSearchesData = {
    body: {
        title?: string;
        /**
         * Page text; the first 15,000 characters are used.
         */
        content: string;
        /**
         * How many queries to return.
         */
        maxTopics?: number;
        chatModel?: ModelWithProvider;
    };
    path?: never;
    query?: never;
    url: '/agent/topic-searches';
};

export declare type GenerateTopicSearchesError = GenerateTopicSearchesErrors[keyof GenerateTopicSearchesErrors];

export declare type GenerateTopicSearchesErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GenerateTopicSearchesResponse = GenerateTopicSearchesResponses[keyof GenerateTopicSearchesResponses];

export declare type GenerateTopicSearchesResponses = {
    /**
     * Search queries
     */
    200: {
        topics: Array<string>;
        success: boolean;
    };
};

/**
 * List browsable tables and maintenance actions
 */
export declare const getAdminDatabase: <ThrowOnError extends boolean = false>(options?: Options<GetAdminDatabaseData, ThrowOnError>) => RequestResult<GetAdminDatabaseResponses, GetAdminDatabaseErrors, ThrowOnError>;

export declare type GetAdminDatabaseData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/admin/database';
};

export declare type GetAdminDatabaseError = GetAdminDatabaseErrors[keyof GetAdminDatabaseErrors];

export declare type GetAdminDatabaseErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type GetAdminDatabaseResponse = GetAdminDatabaseResponses[keyof GetAdminDatabaseResponses];

export declare type GetAdminDatabaseResponses = {
    /**
     * Tables with row counts, writable columns and cleanups
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Get news widget settings and archive stats
 */
export declare const getAdminNews: <ThrowOnError extends boolean = false>(options?: Options<GetAdminNewsData, ThrowOnError>) => RequestResult<GetAdminNewsResponses, GetAdminNewsErrors, ThrowOnError>;

export declare type GetAdminNewsData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * Return the archived articles for this topic.
         */
        topic?: string;
    };
    url: '/admin/news';
};

export declare type GetAdminNewsError = GetAdminNewsErrors[keyof GetAdminNewsErrors];

export declare type GetAdminNewsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type GetAdminNewsResponse = GetAdminNewsResponses[keyof GetAdminNewsResponses];

export declare type GetAdminNewsResponses = {
    /**
     * Settings and stats, or one topic's stored articles with `topic`
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Get site telemetry
 */
export declare const getAdminOverview: <ThrowOnError extends boolean = false>(options?: Options<GetAdminOverviewData, ThrowOnError>) => RequestResult<GetAdminOverviewResponses, GetAdminOverviewErrors, ThrowOnError>;

export declare type GetAdminOverviewData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/admin/overview';
};

export declare type GetAdminOverviewError = GetAdminOverviewErrors[keyof GetAdminOverviewErrors];

export declare type GetAdminOverviewErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type GetAdminOverviewResponse = GetAdminOverviewResponses[keyof GetAdminOverviewResponses];

export declare type GetAdminOverviewResponses = {
    /**
     * Counters
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Fetch and cache article from URL
 */
export declare const getArticle: <ThrowOnError extends boolean = false>(options: Options<GetArticleData, ThrowOnError>) => RequestResult<GetArticleResponses, GetArticleErrors, ThrowOnError>;

export declare type GetArticleData = {
    body?: never;
    path?: never;
    query: {
        url: string;
    };
    url: '/doc/article';
};

export declare type GetArticleError = GetArticleErrors[keyof GetArticleErrors];

export declare type GetArticleErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GetArticleResponse = GetArticleResponses[keyof GetArticleResponses];

export declare type GetArticleResponses = {
    /**
     * Article content
     */
    200: {
        cached?: boolean;
        article?: Article;
        isVideo?: boolean;
    };
};

/**
 * Get a chat with messages
 */
export declare const getChatById: <ThrowOnError extends boolean = false>(options: Options<GetChatByIdData, ThrowOnError>) => RequestResult<GetChatByIdResponses, GetChatByIdErrors, ThrowOnError>;

export declare type GetChatByIdData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/chats/{id}';
};

export declare type GetChatByIdError = GetChatByIdErrors[keyof GetChatByIdErrors];

export declare type GetChatByIdErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type GetChatByIdResponse = GetChatByIdResponses[keyof GetChatByIdResponses];

export declare type GetChatByIdResponses = {
    /**
     * Chat and messages
     */
    200: {
        chat?: Chat;
        messages?: Array<{
            [key: string]: unknown;
        }>;
    };
};

/**
 * Get the location this request geolocates to
 */
export declare const getClientLocation: <ThrowOnError extends boolean = false>(options?: Options<GetClientLocationData, ThrowOnError>) => RequestResult<GetClientLocationResponses, GetClientLocationErrors, ThrowOnError>;

export declare type GetClientLocationData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/geolocation';
};

export declare type GetClientLocationError = GetClientLocationErrors[keyof GetClientLocationErrors];

export declare type GetClientLocationErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type GetClientLocationResponse = GetClientLocationResponses[keyof GetClientLocationResponses];

export declare type GetClientLocationResponses = {
    /**
     * Location
     */
    200: ClientLocation;
};

/**
 * Get application configuration
 */
export declare const getConfig: <ThrowOnError extends boolean = false>(options?: Options<GetConfigData, ThrowOnError>) => RequestResult<GetConfigResponses, unknown, ThrowOnError>;

export declare type GetConfigData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/config';
};

export declare type GetConfigResponse = GetConfigResponses[keyof GetConfigResponses];

export declare type GetConfigResponses = {
    /**
     * Config values and UI field definitions
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Refresh a linked account's profile and plan
 *
 * The key must be sent in a header; the query-string form is not accepted here.
 */
export declare const getConnectedAccount: <ThrowOnError extends boolean = false>(options?: Options<GetConnectedAccountData, ThrowOnError>) => RequestResult<GetConnectedAccountResponses, GetConnectedAccountErrors, ThrowOnError>;

export declare type GetConnectedAccountData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/connect/me';
};

export declare type GetConnectedAccountError = GetConnectedAccountErrors[keyof GetConnectedAccountErrors];

export declare type GetConnectedAccountErrors = {
    /**
     * Invalid API key
     */
    401: {
        error?: string;
    };
};

export declare type GetConnectedAccountResponse = GetConnectedAccountResponses[keyof GetConnectedAccountResponses];

export declare type GetConnectedAccountResponses = {
    /**
     * Account
     */
    200: {
        user: ConnectUser;
        /**
         * Lower-case plan key, e.g. `free`, `pro`.
         */
        plan: string;
        /**
         * Payment link for the next plan; null when already paid.
         */
        upgrade_url?: string | null;
    };
};

/**
 * Get a document by ID
 */
export declare const getDocumentById: <ThrowOnError extends boolean = false>(options: Options<GetDocumentByIdData, ThrowOnError>) => RequestResult<GetDocumentByIdResponses, GetDocumentByIdErrors, ThrowOnError>;

export declare type GetDocumentByIdData = {
    body?: never;
    path: {
        id: number;
    };
    query?: never;
    url: '/doc/documents/{id}';
};

export declare type GetDocumentByIdError = GetDocumentByIdErrors[keyof GetDocumentByIdErrors];

export declare type GetDocumentByIdErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type GetDocumentByIdResponse = GetDocumentByIdResponses[keyof GetDocumentByIdResponses];

export declare type GetDocumentByIdResponses = {
    /**
     * Document
     */
    200: Document_2;
};

/**
 * Get enabled search engines
 */
export declare const getEngineStatus: <ThrowOnError extends boolean = false>(options?: Options<GetEngineStatusData, ThrowOnError>) => RequestResult<GetEngineStatusResponses, unknown, ThrowOnError>;

export declare type GetEngineStatusData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/search/engines/status';
};

export declare type GetEngineStatusResponse = GetEngineStatusResponses[keyof GetEngineStatusResponses];

export declare type GetEngineStatusResponses = {
    /**
     * Enabled engines
     */
    200: {
        enabledEngines?: Array<string>;
    };
};

/**
 * Stream a Drive file's contents
 */
export declare const getGoogleDriveContent: <ThrowOnError extends boolean = false>(options: Options<GetGoogleDriveContentData, ThrowOnError>) => RequestResult<GetGoogleDriveContentResponses, GetGoogleDriveContentErrors, ThrowOnError>;

export declare type GetGoogleDriveContentData = {
    body?: never;
    path?: never;
    query: {
        fileId: string;
    };
    url: '/doc/google-docs/content';
};

export declare type GetGoogleDriveContentError = GetGoogleDriveContentErrors[keyof GetGoogleDriveContentErrors];

export declare type GetGoogleDriveContentErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Not connected to Google Drive
     */
    401: {
        success?: boolean;
        error?: string;
        needsReauth?: boolean;
    };
    /**
     * This kind of Google file has no preview
     */
    415: ErrorResponse;
};

export declare type GetGoogleDriveContentResponse = GetGoogleDriveContentResponses[keyof GetGoogleDriveContentResponses];

export declare type GetGoogleDriveContentResponses = {
    /**
     * File bytes: PDFs and images as-is, Google Docs as HTML, Sheets and Slides as PDF
     */
    200: Blob | File;
};

/**
 * Download a Google Drive file by ID
 */
export declare const getGoogleDriveFile: <ThrowOnError extends boolean = false>(options: Options<GetGoogleDriveFileData, ThrowOnError>) => RequestResult<GetGoogleDriveFileResponses, unknown, ThrowOnError>;

export declare type GetGoogleDriveFileData = {
    body?: never;
    path?: never;
    query: {
        fileId: string;
    };
    url: '/doc/google-docs/files';
};

export declare type GetGoogleDriveFileResponse = GetGoogleDriveFileResponses[keyof GetGoogleDriveFileResponses];

export declare type GetGoogleDriveFileResponses = {
    /**
     * File content (base64)
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * List every file under a Drive folder
 */
export declare const getGoogleDriveFolderTree: <ThrowOnError extends boolean = false>(options: Options<GetGoogleDriveFolderTreeData, ThrowOnError>) => RequestResult<GetGoogleDriveFolderTreeResponses, GetGoogleDriveFolderTreeErrors, ThrowOnError>;

export declare type GetGoogleDriveFolderTreeData = {
    body?: never;
    path?: never;
    query: {
        /**
         * Folder to walk; `root` for all of My Drive.
         */
        folderId: string;
    };
    url: '/doc/google-docs/folder-tree';
};

export declare type GetGoogleDriveFolderTreeError = GetGoogleDriveFolderTreeErrors[keyof GetGoogleDriveFolderTreeErrors];

export declare type GetGoogleDriveFolderTreeErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Not connected to Google Drive
     */
    401: {
        success?: boolean;
        error?: string;
        needsReauth?: boolean;
    };
};

export declare type GetGoogleDriveFolderTreeResponse = GetGoogleDriveFolderTreeResponses[keyof GetGoogleDriveFolderTreeResponses];

export declare type GetGoogleDriveFolderTreeResponses = {
    /**
     * Walk result
     */
    200: {
        success?: boolean;
        root?: DriveItem;
        items?: Array<DriveItem>;
        /**
         * True when the walk stopped early (2,000 items or 8 levels).
         */
        truncated?: boolean;
    };
};

/**
 * Get Google access token from cookies
 */
export declare const getGoogleToken: <ThrowOnError extends boolean = false>(options?: Options<GetGoogleTokenData, ThrowOnError>) => RequestResult<GetGoogleTokenResponses, unknown, ThrowOnError>;

export declare type GetGoogleTokenData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/google-docs/token';
};

export declare type GetGoogleTokenResponse = GetGoogleTokenResponses[keyof GetGoogleTokenResponses];

export declare type GetGoogleTokenResponses = {
    /**
     * Access token
     */
    200: {
        success?: boolean;
        accessToken?: string;
    };
};

/**
 * Get a memory
 */
export declare const getMemory: <ThrowOnError extends boolean = false>(options: Options<GetMemoryData, ThrowOnError>) => RequestResult<GetMemoryResponses, GetMemoryErrors, ThrowOnError>;

export declare type GetMemoryData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/user/memories/{id}';
};

export declare type GetMemoryError = GetMemoryErrors[keyof GetMemoryErrors];

export declare type GetMemoryErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type GetMemoryResponse = GetMemoryResponses[keyof GetMemoryResponses];

export declare type GetMemoryResponses = {
    /**
     * Memory
     */
    200: Memory;
};

/**
 * Get the news widget's public settings
 */
export declare const getNewsSettings: <ThrowOnError extends boolean = false>(options?: Options<GetNewsSettingsData, ThrowOnError>) => RequestResult<GetNewsSettingsResponses, unknown, ThrowOnError>;

export declare type GetNewsSettingsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/news/settings';
};

export declare type GetNewsSettingsResponse = GetNewsSettingsResponses[keyof GetNewsSettingsResponses];

export declare type GetNewsSettingsResponses = {
    /**
     * Settings
     */
    200: NewsWidgetSettings;
};

/**
 * Get NotebookLM connection status
 */
export declare const getNotebooklmStatus: <ThrowOnError extends boolean = false>(options?: Options<GetNotebooklmStatusData, ThrowOnError>) => RequestResult<GetNotebooklmStatusResponses, GetNotebooklmStatusErrors, ThrowOnError>;

export declare type GetNotebooklmStatusData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/notebooklm/status';
};

export declare type GetNotebooklmStatusError = GetNotebooklmStatusErrors[keyof GetNotebooklmStatusErrors];

export declare type GetNotebooklmStatusErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type GetNotebooklmStatusResponse = GetNotebooklmStatusResponses[keyof GetNotebooklmStatusResponses];

export declare type GetNotebooklmStatusResponses = {
    /**
     * Connection status
     */
    200: {
        connected?: boolean;
        googleEmail?: string;
        createdAt?: string;
        expiresAt?: string;
    };
};

/**
 * Get a playlist
 *
 * Public playlists are readable by anyone; others only by their members.
 */
export declare const getPlaylist: <ThrowOnError extends boolean = false>(options: Options<GetPlaylistData, ThrowOnError>) => RequestResult<GetPlaylistResponses, GetPlaylistErrors, ThrowOnError>;

export declare type GetPlaylistData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/learn/playlists/{id}';
};

export declare type GetPlaylistError = GetPlaylistErrors[keyof GetPlaylistErrors];

export declare type GetPlaylistErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type GetPlaylistResponse = GetPlaylistResponses[keyof GetPlaylistResponses];

export declare type GetPlaylistResponses = {
    /**
     * Playlist
     */
    200: {
        playlist: Playlist;
    };
};

/**
 * Resolve a share token to a document
 */
export declare const getSharedDocument: <ThrowOnError extends boolean = false>(options: Options<GetSharedDocumentData, ThrowOnError>) => RequestResult<GetSharedDocumentResponses, GetSharedDocumentErrors, ThrowOnError>;

export declare type GetSharedDocumentData = {
    body?: never;
    path: {
        /**
         * Share token
         */
        id: string;
    };
    query?: never;
    url: '/doc/share/{id}';
};

export declare type GetSharedDocumentError = GetSharedDocumentErrors[keyof GetSharedDocumentErrors];

export declare type GetSharedDocumentErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
    /**
     * Share link expired
     */
    410: ErrorResponse;
};

export declare type GetSharedDocumentResponse = GetSharedDocumentResponses[keyof GetSharedDocumentResponses];

export declare type GetSharedDocumentResponses = {
    /**
     * Shared document
     */
    200: {
        success?: boolean;
        data?: Document_2;
    };
};

/**
 * Get trending topics with headlines
 *
 * Wikipedia's daily most-viewed topics joined to matching headlines from The News API. Answers are cached and archived, so an upstream outage serves the last good copy.
 */
export declare const getTrendingNews: <ThrowOnError extends boolean = false>(options?: Options<GetTrendingNewsData, ThrowOnError>) => RequestResult<GetTrendingNewsResponses, GetTrendingNewsErrors, ThrowOnError>;

export declare type GetTrendingNewsData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * How many topics.
         */
        limit?: number;
        /**
         * Return headlines for this one topic instead of the trending list.
         */
        topic?: string;
        /**
         * Comma-separated topics to use instead of the site defaults (max 20).
         */
        topics?: string;
    };
    url: '/news/trending';
};

export declare type GetTrendingNewsError = GetTrendingNewsErrors[keyof GetTrendingNewsErrors];

export declare type GetTrendingNewsErrors = {
    /**
     * The news widget is switched off on this site
     */
    404: ErrorResponse;
    /**
     * Upstream news source failed and nothing is archived
     */
    502: ErrorResponse;
};

export declare type GetTrendingNewsResponse = GetTrendingNewsResponses[keyof GetTrendingNewsResponses];

export declare type GetTrendingNewsResponses = {
    /**
     * Trending topics, or one topic's headlines with `topic`
     */
    200: {
        source?: string;
        date?: string;
        topics: Array<NewsTopic>;
    } | {
        topic: string;
        news_count?: number;
        articles: Array<NewsArticle>;
    };
};

/**
 * Get extracted content for an uploaded file
 */
export declare const getUploadedFile: <ThrowOnError extends boolean = false>(options: Options<GetUploadedFileData, ThrowOnError>) => RequestResult<GetUploadedFileResponses, unknown, ThrowOnError>;

export declare type GetUploadedFileData = {
    body?: never;
    path?: never;
    query: {
        fileId: string;
    };
    url: '/doc/uploads';
};

export declare type GetUploadedFileResponse = GetUploadedFileResponses[keyof GetUploadedFileResponses];

export declare type GetUploadedFileResponses = {
    /**
     * File content
     */
    200: {
        title?: string;
        content?: string;
    };
};

/**
 * Get current user profile
 */
export declare const getUser: <ThrowOnError extends boolean = false>(options?: Options<GetUserData, ThrowOnError>) => RequestResult<GetUserResponses, GetUserErrors, ThrowOnError>;

export declare type GetUserData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user';
};

export declare type GetUserError = GetUserErrors[keyof GetUserErrors];

export declare type GetUserErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type GetUserResponse = GetUserResponses[keyof GetUserResponses];

export declare type GetUserResponses = {
    /**
     * User profile
     */
    200: UserProfile;
};

/**
 * Get storage usage
 */
export declare const getUserStorage: <ThrowOnError extends boolean = false>(options?: Options<GetUserStorageData, ThrowOnError>) => RequestResult<GetUserStorageResponses, GetUserStorageErrors, ThrowOnError>;

export declare type GetUserStorageData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/storage';
};

export declare type GetUserStorageError = GetUserStorageErrors[keyof GetUserStorageErrors];

export declare type GetUserStorageErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type GetUserStorageResponse = GetUserStorageResponses[keyof GetUserStorageResponses];

export declare type GetUserStorageResponses = {
    /**
     * Storage info
     */
    200: StorageInfo;
};

/**
 * Get Google OAuth consent URL
 */
export declare const googleDocsAuth: <ThrowOnError extends boolean = false>(options?: Options<GoogleDocsAuthData, ThrowOnError>) => RequestResult<GoogleDocsAuthResponses, unknown, ThrowOnError>;

export declare type GoogleDocsAuthData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/google-docs/auth';
};

export declare type GoogleDocsAuthResponse = GoogleDocsAuthResponses[keyof GoogleDocsAuthResponses];

export declare type GoogleDocsAuthResponses = {
    /**
     * Auth URL
     */
    200: {
        success?: boolean;
        data?: {
            authUrl?: string;
        };
    };
};

/**
 * Check Google Drive connection status
 */
export declare const googleDocsAuthStatus: <ThrowOnError extends boolean = false>(options?: Options<GoogleDocsAuthStatusData, ThrowOnError>) => RequestResult<GoogleDocsAuthStatusResponses, unknown, ThrowOnError>;

export declare type GoogleDocsAuthStatusData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/google-docs/auth/status';
};

export declare type GoogleDocsAuthStatusResponse = GoogleDocsAuthStatusResponses[keyof GoogleDocsAuthStatusResponses];

export declare type GoogleDocsAuthStatusResponses = {
    /**
     * Connection status
     */
    200: {
        success?: boolean;
        isConnected?: boolean;
        hasAccessToken?: boolean;
        hasRefreshToken?: boolean;
    };
};

/**
 * OAuth callback — exchanges code for tokens
 */
export declare const googleDocsCallback: <ThrowOnError extends boolean = false>(options: Options<GoogleDocsCallbackData, ThrowOnError>) => RequestResult<GoogleDocsCallbackResponses, unknown, ThrowOnError>;

export declare type GoogleDocsCallbackData = {
    body?: never;
    path?: never;
    query: {
        code: string;
    };
    url: '/doc/google-docs/callback';
};

export declare type GoogleDocsCallbackResponse = GoogleDocsCallbackResponses[keyof GoogleDocsCallbackResponses];

export declare type GoogleDocsCallbackResponses = {
    /**
     * HTML popup-close page
     */
    200: string;
};

export declare type IdPath = string;

/**
 * Import a Google Docs document
 */
export declare const importFromGoogleDocs: <ThrowOnError extends boolean = false>(options: Options<ImportFromGoogleDocsData, ThrowOnError>) => RequestResult<ImportFromGoogleDocsResponses, unknown, ThrowOnError>;

export declare type ImportFromGoogleDocsData = {
    body: {
        googleDocId: string;
        accessToken: string;
        refreshToken?: string;
        parentId?: string;
    };
    path?: never;
    query?: never;
    url: '/doc/google-docs/import';
};

export declare type ImportFromGoogleDocsResponse = ImportFromGoogleDocsResponses[keyof ImportFromGoogleDocsResponses];

export declare type ImportFromGoogleDocsResponses = {
    /**
     * Imported
     */
    201: {
        success?: boolean;
    };
};

export declare type LimitQuery = number;

/**
 * Get one page of a table's rows
 */
export declare const listAdminTableRows: <ThrowOnError extends boolean = false>(options: Options<ListAdminTableRowsData, ThrowOnError>) => RequestResult<ListAdminTableRowsResponses, ListAdminTableRowsErrors, ThrowOnError>;

export declare type ListAdminTableRowsData = {
    body?: never;
    path: {
        /**
         * A registered table key.
         */
        table: string;
    };
    query?: {
        page?: number;
        limit?: number;
        /**
         * Free-text filter.
         */
        q?: string;
    };
    url: '/admin/database/{table}';
};

export declare type ListAdminTableRowsError = ListAdminTableRowsErrors[keyof ListAdminTableRowsErrors];

export declare type ListAdminTableRowsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type ListAdminTableRowsResponse = ListAdminTableRowsResponses[keyof ListAdminTableRowsResponses];

export declare type ListAdminTableRowsResponses = {
    /**
     * Rows
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * List users with usage counters
 */
export declare const listAdminUsers: <ThrowOnError extends boolean = false>(options?: Options<ListAdminUsersData, ThrowOnError>) => RequestResult<ListAdminUsersResponses, ListAdminUsersErrors, ThrowOnError>;

export declare type ListAdminUsersData = {
    body?: never;
    path?: never;
    query?: {
        page?: number;
        limit?: number;
        /**
         * Free-text filter.
         */
        q?: string;
        hideAnonymous?: boolean;
        /**
         * Any column, usage counters included.
         */
        sort?: string;
        dir?: 'asc' | 'desc';
    };
    url: '/admin/users';
};

export declare type ListAdminUsersError = ListAdminUsersErrors[keyof ListAdminUsersErrors];

export declare type ListAdminUsersErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
};

export declare type ListAdminUsersResponse = ListAdminUsersResponses[keyof ListAdminUsersResponses];

export declare type ListAdminUsersResponses = {
    /**
     * Page of users
     */
    200: {
        users?: Array<{
            [key: string]: unknown;
        }>;
        page?: number;
        limit?: number;
        matchedUsers?: number;
        pageCount?: number;
        totals?: {
            [key: string]: unknown;
        };
        /**
         * Alias of matchedUsers.
         */
        total?: number;
        /**
         * Alias of pageCount.
         */
        pages?: number;
    };
};

/**
 * List my saved agent-skill preferences
 */
export declare const listAgentSkills: <ThrowOnError extends boolean = false>(options?: Options<ListAgentSkillsData, ThrowOnError>) => RequestResult<ListAgentSkillsResponses, ListAgentSkillsErrors, ThrowOnError>;

export declare type ListAgentSkillsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/agent-skills';
};

export declare type ListAgentSkillsError = ListAgentSkillsErrors[keyof ListAgentSkillsErrors];

export declare type ListAgentSkillsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListAgentSkillsResponse = ListAgentSkillsResponses[keyof ListAgentSkillsResponses];

export declare type ListAgentSkillsResponses = {
    /**
     * Stored preferences
     */
    200: Array<{
        [key: string]: unknown;
    }>;
};

/**
 * List the social sign-in providers configured here
 *
 * Used to show only the sign-in buttons that will work. Sign-in itself is Better Auth, under `/auth*`.
 */
export declare const listAuthProviders: <ThrowOnError extends boolean = false>(options?: Options<ListAuthProvidersData, ThrowOnError>) => RequestResult<ListAuthProvidersResponses, unknown, ThrowOnError>;

export declare type ListAuthProvidersData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/auth/providers';
};

export declare type ListAuthProvidersResponse = ListAuthProvidersResponses[keyof ListAuthProvidersResponses];

export declare type ListAuthProvidersResponses = {
    /**
     * Providers
     */
    200: {
        providers: Array<'google' | 'discord' | 'linkedin'>;
    };
};

/**
 * List user's chats
 */
export declare const listChats: <ThrowOnError extends boolean = false>(options?: Options<ListChatsData, ThrowOnError>) => RequestResult<ListChatsResponses, ListChatsErrors, ThrowOnError>;

export declare type ListChatsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/agent/chats';
};

export declare type ListChatsError = ListChatsErrors[keyof ListChatsErrors];

export declare type ListChatsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListChatsResponse = ListChatsResponses[keyof ListChatsResponses];

export declare type ListChatsResponses = {
    /**
     * Chat list
     */
    200: {
        chats?: Array<Chat>;
    };
};

/**
 * List documents
 */
export declare const listDocuments: <ThrowOnError extends boolean = false>(options?: Options<ListDocumentsData, ThrowOnError>) => RequestResult<ListDocumentsResponses, unknown, ThrowOnError>;

export declare type ListDocumentsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/documents';
};

export declare type ListDocumentsResponse = ListDocumentsResponses[keyof ListDocumentsResponses];

export declare type ListDocumentsResponses = {
    /**
     * Document list
     */
    200: Array<Document_2>;
};

/**
 * List skills and whether each is enabled
 */
export declare const listEnabledSkills: <ThrowOnError extends boolean = false>(options?: Options<ListEnabledSkillsData, ThrowOnError>) => RequestResult<ListEnabledSkillsResponses, ListEnabledSkillsErrors, ThrowOnError>;

export declare type ListEnabledSkillsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/enabled-skills';
};

export declare type ListEnabledSkillsError = ListEnabledSkillsErrors[keyof ListEnabledSkillsErrors];

export declare type ListEnabledSkillsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ListEnabledSkillsResponse = ListEnabledSkillsResponses[keyof ListEnabledSkillsResponses];

export declare type ListEnabledSkillsResponses = {
    /**
     * Skills
     */
    200: Array<{
        id?: string;
        enabled?: boolean;
    }>;
};

/**
 * List favorites
 */
export declare const listFavorites: <ThrowOnError extends boolean = false>(options?: Options<ListFavoritesData, ThrowOnError>) => RequestResult<ListFavoritesResponses, ListFavoritesErrors, ThrowOnError>;

export declare type ListFavoritesData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/favorites';
};

export declare type ListFavoritesError = ListFavoritesErrors[keyof ListFavoritesErrors];

export declare type ListFavoritesErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListFavoritesResponse = ListFavoritesResponses[keyof ListFavoritesResponses];

export declare type ListFavoritesResponses = {
    /**
     * Favorites
     */
    200: {
        favorites?: Array<Favorite>;
    };
};

/**
 * List the folders inside a Drive folder
 */
export declare const listGoogleDriveFolders: <ThrowOnError extends boolean = false>(options?: Options<ListGoogleDriveFoldersData, ThrowOnError>) => RequestResult<ListGoogleDriveFoldersResponses, ListGoogleDriveFoldersErrors, ThrowOnError>;

export declare type ListGoogleDriveFoldersData = {
    body?: never;
    path?: never;
    query?: {
        /**
         * Folder to open; `root` is My Drive.
         */
        parentId?: string;
    };
    url: '/doc/google-docs/folders';
};

export declare type ListGoogleDriveFoldersError = ListGoogleDriveFoldersErrors[keyof ListGoogleDriveFoldersErrors];

export declare type ListGoogleDriveFoldersErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Not connected to Google Drive
     */
    401: {
        success?: boolean;
        error?: string;
        needsReauth?: boolean;
    };
};

export declare type ListGoogleDriveFoldersResponse = ListGoogleDriveFoldersResponses[keyof ListGoogleDriveFoldersResponses];

export declare type ListGoogleDriveFoldersResponses = {
    /**
     * Folder and its subfolders
     */
    200: {
        success?: boolean;
        folder?: {
            id?: string;
            name?: string;
        };
        folders?: Array<{
            id?: string;
            name?: string;
        }>;
    };
};

/**
 * List MCP servers
 */
export declare const listMcpServers: <ThrowOnError extends boolean = false>(options?: Options<ListMcpServersData, ThrowOnError>) => RequestResult<ListMcpServersResponses, unknown, ThrowOnError>;

export declare type ListMcpServersData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/agent/mcpservers';
};

export declare type ListMcpServersResponse = ListMcpServersResponses[keyof ListMcpServersResponses];

export declare type ListMcpServersResponses = {
    /**
     * MCP server list
     */
    200: {
        servers?: Array<McpServer>;
    };
};

/**
 * List my memories
 */
export declare const listMemories: <ThrowOnError extends boolean = false>(options?: Options<ListMemoriesData, ThrowOnError>) => RequestResult<ListMemoriesResponses, ListMemoriesErrors, ThrowOnError>;

export declare type ListMemoriesData = {
    body?: never;
    path?: never;
    query?: {
        search?: string;
        type?: 'user' | 'feedback' | 'project' | 'reference' | 'conversation';
        /**
         * Minimum importance.
         */
        importance?: number;
        limit?: number;
    };
    url: '/user/memories';
};

export declare type ListMemoriesError = ListMemoriesErrors[keyof ListMemoriesErrors];

export declare type ListMemoriesErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ListMemoriesResponse = ListMemoriesResponses[keyof ListMemoriesResponses];

export declare type ListMemoriesResponses = {
    /**
     * Memories, most important first
     */
    200: Array<Memory>;
};

/**
 * List notebooks
 */
export declare const listNotebooks: <ThrowOnError extends boolean = false>(options?: Options<ListNotebooksData, ThrowOnError>) => RequestResult<ListNotebooksResponses, ListNotebooksErrors, ThrowOnError>;

export declare type ListNotebooksData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/notebooklm/notebooks';
};

export declare type ListNotebooksError = ListNotebooksErrors[keyof ListNotebooksErrors];

export declare type ListNotebooksErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

/**
 * List notebook sources
 */
export declare const listNotebookSources: <ThrowOnError extends boolean = false>(options: Options<ListNotebookSourcesData, ThrowOnError>) => RequestResult<ListNotebookSourcesResponses, ListNotebookSourcesErrors, ThrowOnError>;

export declare type ListNotebookSourcesData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/notebooklm/notebooks/{id}/sources';
};

export declare type ListNotebookSourcesError = ListNotebookSourcesErrors[keyof ListNotebookSourcesErrors];

export declare type ListNotebookSourcesErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListNotebookSourcesResponse = ListNotebookSourcesResponses[keyof ListNotebookSourcesResponses];

export declare type ListNotebookSourcesResponses = {
    /**
     * Sources
     */
    200: {
        sources?: Array<NotebookSource>;
    };
};

export declare type ListNotebooksResponse = ListNotebooksResponses[keyof ListNotebooksResponses];

export declare type ListNotebooksResponses = {
    /**
     * Notebooks
     */
    200: {
        notebooks?: Array<Notebook>;
    };
};

/**
 * List my saved playlists and invites
 */
export declare const listPlaylists: <ThrowOnError extends boolean = false>(options?: Options<ListPlaylistsData, ThrowOnError>) => RequestResult<ListPlaylistsResponses, ListPlaylistsErrors, ThrowOnError>;

export declare type ListPlaylistsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/learn/playlists';
};

export declare type ListPlaylistsError = ListPlaylistsErrors[keyof ListPlaylistsErrors];

export declare type ListPlaylistsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListPlaylistsResponse = ListPlaylistsResponses[keyof ListPlaylistsResponses];

export declare type ListPlaylistsResponses = {
    /**
     * Playlists
     */
    200: {
        playlists: Array<Playlist>;
        invites: Array<{
            [key: string]: unknown;
        }>;
    };
};

/**
 * List LLM providers
 */
export declare const listProviders: <ThrowOnError extends boolean = false>(options?: Options<ListProvidersData, ThrowOnError>) => RequestResult<ListProvidersResponses, unknown, ThrowOnError>;

export declare type ListProvidersData = {
    body?: never;
    path?: never;
    query?: {
        guest?: 'true';
    };
    url: '/agent/providers';
};

export declare type ListProvidersResponse = ListProvidersResponses[keyof ListProvidersResponses];

export declare type ListProvidersResponses = {
    /**
     * Provider list
     */
    200: {
        providers?: Array<Provider>;
        isGuest?: boolean;
    };
};

/**
 * List quotes for a document
 */
export declare const listQuotes: <ThrowOnError extends boolean = false>(options: Options<ListQuotesData, ThrowOnError>) => RequestResult<ListQuotesResponses, ListQuotesErrors, ThrowOnError>;

export declare type ListQuotesData = {
    body?: never;
    path?: never;
    query: {
        documentId: string;
    };
    url: '/doc/quotes';
};

export declare type ListQuotesError = ListQuotesErrors[keyof ListQuotesErrors];

export declare type ListQuotesErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
};

export declare type ListQuotesResponse = ListQuotesResponses[keyof ListQuotesResponses];

export declare type ListQuotesResponses = {
    /**
     * Quotes
     */
    200: {
        success?: boolean;
        data?: Array<Quote>;
    };
};

/**
 * List all available search engines by category
 */
export declare const listSearchEngines: <ThrowOnError extends boolean = false>(options?: Options<ListSearchEnginesData, ThrowOnError>) => RequestResult<ListSearchEnginesResponses, unknown, ThrowOnError>;

export declare type ListSearchEnginesData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/search/engines';
};

export declare type ListSearchEnginesResponse = ListSearchEnginesResponses[keyof ListSearchEnginesResponses];

export declare type ListSearchEnginesResponses = {
    /**
     * Engines grouped by category
     */
    200: {
        engines?: {
            [key: string]: Array<{
                name?: string;
                categories?: Array<string>;
            }>;
        };
    };
};

/**
 * List active sessions
 */
export declare const listSessions: <ThrowOnError extends boolean = false>(options?: Options<ListSessionsData, ThrowOnError>) => RequestResult<ListSessionsResponses, ListSessionsErrors, ThrowOnError>;

export declare type ListSessionsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/sessions';
};

export declare type ListSessionsError = ListSessionsErrors[keyof ListSessionsErrors];

export declare type ListSessionsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListSessionsResponse = ListSessionsResponses[keyof ListSessionsResponses];

export declare type ListSessionsResponses = {
    /**
     * Sessions
     */
    200: Array<UserSession>;
};

/**
 * List speech-to-text models (OpenAI-compatible)
 *
 * OpenAI-compatible: point a client's base URL at `https://qwksearch.com/api/v1`. Always requires a QwkSearch API key in a header (`Authorization: Bearer` or `X-API-Key`); a query-string key or a session cookie is rejected.
 */
export declare const listTranscriptionModels: <ThrowOnError extends boolean = false>(options?: Options<ListTranscriptionModelsData, ThrowOnError>) => RequestResult<ListTranscriptionModelsResponses, ListTranscriptionModelsErrors, ThrowOnError>;

export declare type ListTranscriptionModelsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/v1/models';
};

export declare type ListTranscriptionModelsError = ListTranscriptionModelsErrors[keyof ListTranscriptionModelsErrors];

export declare type ListTranscriptionModelsErrors = {
    /**
     * Missing or invalid API key
     */
    401: OpenAiError;
    /**
     * Key store unavailable
     */
    503: OpenAiError;
};

export declare type ListTranscriptionModelsResponse = ListTranscriptionModelsResponses[keyof ListTranscriptionModelsResponses];

export declare type ListTranscriptionModelsResponses = {
    /**
     * Models
     */
    200: {
        object: 'list';
        data: Array<{
            id: 'small' | 'fast' | 'medium' | 'turbo' | 'large';
            object: 'model';
            created: number;
            owned_by: string;
        }>;
    };
};

/**
 * List linked OAuth accounts
 */
export declare const listUserAccounts: <ThrowOnError extends boolean = false>(options?: Options<ListUserAccountsData, ThrowOnError>) => RequestResult<ListUserAccountsResponses, ListUserAccountsErrors, ThrowOnError>;

export declare type ListUserAccountsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/accounts';
};

export declare type ListUserAccountsError = ListUserAccountsErrors[keyof ListUserAccountsErrors];

export declare type ListUserAccountsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ListUserAccountsResponse = ListUserAccountsResponses[keyof ListUserAccountsResponses];

export declare type ListUserAccountsResponses = {
    /**
     * Accounts
     */
    200: Array<{
        id?: string;
        providerId?: string;
        accountId?: string;
        createdAt?: string;
    }>;
};

export declare type McpServer = {
    id?: string;
    type?: string;
    name?: string;
    config?: {
        [key: string]: unknown;
    };
    enabled?: boolean;
};

export declare type Memory = {
    id: string;
    userId?: string;
    name: string;
    type: 'user' | 'feedback' | 'project' | 'reference' | 'conversation';
    description?: string;
    content: string;
    importance: number;
    accessCount?: number;
    tags?: Array<string>;
    metadata?: {
        [key: string]: unknown;
    };
    createdAt?: string;
    updatedAt?: string;
};

/**
 * A human-readable confirmation.
 */
export declare type MessageResponse = {
    message: string;
};

export declare type ModelWithProvider = {
    providerId: string;
    key: string;
};

export declare type NewsArticle = {
    title: string;
    url?: string;
    source?: string;
    published_at?: string;
    image_url?: string;
};

export declare type NewsTopic = {
    topic: string;
    wiki_rank?: number;
    wiki_views?: number;
    news_count: number;
    articles: Array<NewsArticle>;
};

export declare type NewsWidgetSettings = {
    enabled: boolean;
    allowUserTopics: boolean;
    /**
     * Comma-separated topics shown when the visitor named none.
     */
    defaultTopics: string;
    maxTopics: number;
    showImages: boolean;
};

export declare type Notebook = {
    id?: string;
    title?: string;
    createdAt?: string;
};

/**
 * Connect NotebookLM with Google credentials
 */
export declare const notebooklmLogin: <ThrowOnError extends boolean = false>(options: Options<NotebooklmLoginData, ThrowOnError>) => RequestResult<NotebooklmLoginResponses, NotebooklmLoginErrors, ThrowOnError>;

export declare type NotebooklmLoginData = {
    body: {
        email: string;
        password: string;
    };
    path?: never;
    query?: never;
    url: '/notebooklm/login';
};

export declare type NotebooklmLoginError = NotebooklmLoginErrors[keyof NotebooklmLoginErrors];

export declare type NotebooklmLoginErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type NotebooklmLoginResponse = NotebooklmLoginResponses[keyof NotebooklmLoginResponses];

export declare type NotebooklmLoginResponses = {
    /**
     * Login result
     */
    200: {
        success?: boolean;
        googleEmail?: string;
        message?: string;
    };
};

export declare type NotebookSource = {
    id?: string;
    title?: string;
    url?: string;
};

export declare type NumericIdPath = number;

/**
 * OpenAI-shaped error body, used by the `/v1*` routes.
 */
export declare type OpenAiError = {
    error: {
        message: string;
        type: string;
        param?: string | null;
        code?: string | null;
    };
};

export declare type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean, TResponse = unknown> = Options_2<TData, ThrowOnError, TResponse> & {
    /**
     * You can provide a client instance returned by `createClient()` instead of
     * individual options. This might be also useful if you want to implement a
     * custom client.
     */
    client?: Client;
    /**
     * You can pass arbitrary values through the `meta` object. This can be
     * used to access values that aren't defined as part of the SDK function.
     */
    meta?: keyof ClientMeta extends never ? Record<string, unknown> : ClientMeta;
};

export declare type PageQuery = number;

export declare type Pagination = {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
};

export declare type PlanAnswer = {
    question: string;
    answer: string;
};

/**
 * Plan a learning playlist
 *
 * Plans a self-paced study playlist from free courseware and lecture videos. Past the guest rate limit, or with no model configured, it answers in `offline` mode from the bundled catalog instead of failing.
 */
export declare const planPlaylist: <ThrowOnError extends boolean = false>(options: Options<PlanPlaylistData, ThrowOnError>) => RequestResult<PlanPlaylistResponses, PlanPlaylistErrors, ThrowOnError>;

export declare type PlanPlaylistData = {
    body: PlanRequest;
    path?: never;
    query?: never;
    url: '/learn';
};

export declare type PlanPlaylistError = PlanPlaylistErrors[keyof PlanPlaylistErrors];

export declare type PlanPlaylistErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Body too large
     */
    413: ErrorResponse;
};

export declare type PlanPlaylistResponse = PlanPlaylistResponses[keyof PlanPlaylistResponses];

export declare type PlanPlaylistResponses = {
    /**
     * Plan
     */
    200: {
        playlist: Playlist;
        searches: Array<string>;
        mode: 'llm' | 'offline';
        minutesPerWeek?: number;
    };
};

export declare type PlanRequest = {
    /**
     * What the learner wants to learn.
     */
    goal: string;
    /**
     * Answers to the follow-up questions.
     */
    answers?: Array<PlanAnswer>;
};

/**
 * An education playlist.
 */
export declare type Playlist = {
    id: string;
    title: string;
    description?: string;
    categoryId?: string;
    majorId?: string;
    programId?: string;
    level?: string;
    visibility: 'private' | 'unlisted' | 'public';
    ownerId?: string;
    members?: Array<{
        [key: string]: unknown;
    }>;
    items: Array<PlaylistItem>;
    plannedFrom?: {
        goal?: string;
        answers?: Array<PlanAnswer>;
    };
    createdAt?: string;
    updatedAt?: string;
};

export declare type PlaylistItem = {
    id: string;
    title: string;
    url: string;
    /**
     * e.g. `course`, `video`, `reading`.
     */
    kind: string;
    /**
     * Expected time to finish.
     */
    minutes: number;
    estimate: 'exact' | 'rough';
    estimateBasis?: string;
};

export declare type Provider = {
    id?: string;
    type?: string;
    name?: string;
    config?: {
        [key: string]: unknown;
    };
    models?: Array<{
        [key: string]: unknown;
    }>;
};

export declare type Quote = {
    id: string;
    documentId: string;
    text: string;
    source?: string;
    author?: string;
    url?: string;
    pageNumber?: number;
    tags?: Array<string>;
    createdAt?: string;
};

/**
 * Record that a memory was used
 */
export declare const recordMemoryUsage: <ThrowOnError extends boolean = false>(options: Options<RecordMemoryUsageData, ThrowOnError>) => RequestResult<RecordMemoryUsageResponses, RecordMemoryUsageErrors, ThrowOnError>;

export declare type RecordMemoryUsageData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/user/memories/{id}/usage';
};

export declare type RecordMemoryUsageError = RecordMemoryUsageErrors[keyof RecordMemoryUsageErrors];

export declare type RecordMemoryUsageErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type RecordMemoryUsageResponse = RecordMemoryUsageResponses[keyof RecordMemoryUsageResponses];

export declare type RecordMemoryUsageResponses = {
    /**
     * Recorded
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Refresh Google access token using stored refresh token
 */
export declare const refreshGoogleToken: <ThrowOnError extends boolean = false>(options?: Options<RefreshGoogleTokenData, ThrowOnError>) => RequestResult<RefreshGoogleTokenResponses, unknown, ThrowOnError>;

export declare type RefreshGoogleTokenData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/doc/google-docs/refresh-token';
};

export declare type RefreshGoogleTokenResponse = RefreshGoogleTokenResponses[keyof RefreshGoogleTokenResponses];

export declare type RefreshGoogleTokenResponses = {
    /**
     * Refresh result
     */
    200: {
        success?: boolean;
        message?: string;
        expiresAt?: string;
        error?: string;
        needsReauth?: boolean;
    };
};

/**
 * Remove a favorite
 */
export declare const removeFavorite: <ThrowOnError extends boolean = false>(options: Options<RemoveFavoriteData, ThrowOnError>) => RequestResult<RemoveFavoriteResponses, RemoveFavoriteErrors, ThrowOnError>;

export declare type RemoveFavoriteData = {
    body?: never;
    path?: never;
    query: {
        url: string;
    };
    url: '/doc/favorites';
};

export declare type RemoveFavoriteError = RemoveFavoriteErrors[keyof RemoveFavoriteErrors];

export declare type RemoveFavoriteErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type RemoveFavoriteResponse = RemoveFavoriteResponses[keyof RemoveFavoriteResponses];

export declare type RemoveFavoriteResponses = {
    /**
     * Removed
     */
    200: MessageResponse;
};

/**
 * Ask a document's owner for access
 *
 * Emails the owner once. A second request for the same document by the same user is refused.
 */
export declare const requestDocumentAccess: <ThrowOnError extends boolean = false>(options: Options<RequestDocumentAccessData, ThrowOnError>) => RequestResult<RequestDocumentAccessResponses, RequestDocumentAccessErrors, ThrowOnError>;

export declare type RequestDocumentAccessData = {
    body?: never;
    path: {
        id: number;
    };
    query?: never;
    url: '/doc/documents/{id}/access-request';
};

export declare type RequestDocumentAccessError = RequestDocumentAccessErrors[keyof RequestDocumentAccessErrors];

export declare type RequestDocumentAccessErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
    /**
     * Already requested, or already has access
     */
    409: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type RequestDocumentAccessResponse = RequestDocumentAccessResponses[keyof RequestDocumentAccessResponses];

export declare type RequestDocumentAccessResponses = {
    /**
     * Requested
     */
    201: {
        success?: boolean;
        accessRequested?: boolean;
    };
};

/**
 * Revoke all other sessions
 */
export declare const revokeOtherSessions: <ThrowOnError extends boolean = false>(options?: Options<RevokeOtherSessionsData, ThrowOnError>) => RequestResult<RevokeOtherSessionsResponses, RevokeOtherSessionsErrors, ThrowOnError>;

export declare type RevokeOtherSessionsData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/user/sessions';
};

export declare type RevokeOtherSessionsError = RevokeOtherSessionsErrors[keyof RevokeOtherSessionsErrors];

export declare type RevokeOtherSessionsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type RevokeOtherSessionsResponse = RevokeOtherSessionsResponses[keyof RevokeOtherSessionsResponses];

export declare type RevokeOtherSessionsResponses = {
    /**
     * Revoked
     */
    200: MessageResponse;
};

/**
 * Revoke a specific session
 */
export declare const revokeSession: <ThrowOnError extends boolean = false>(options: Options<RevokeSessionData, ThrowOnError>) => RequestResult<RevokeSessionResponses, RevokeSessionErrors, ThrowOnError>;

export declare type RevokeSessionData = {
    body?: never;
    path: {
        id: string;
    };
    query?: never;
    url: '/user/sessions/{id}';
};

export declare type RevokeSessionError = RevokeSessionErrors[keyof RevokeSessionErrors];

export declare type RevokeSessionErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type RevokeSessionResponse = RevokeSessionResponses[keyof RevokeSessionResponses];

export declare type RevokeSessionResponses = {
    /**
     * Revoked
     */
    200: MessageResponse;
};

/**
 * Rewrite text with AI (Groq)
 */
export declare const rewriteText: <ThrowOnError extends boolean = false>(options: Options<RewriteTextData, ThrowOnError>) => RequestResult<RewriteTextResponses, RewriteTextErrors, ThrowOnError>;

export declare type RewriteTextData = {
    body: {
        text: string;
        prompt?: string;
    };
    path?: never;
    query?: never;
    url: '/agent/rewrite';
};

export declare type RewriteTextError = RewriteTextErrors[keyof RewriteTextErrors];

export declare type RewriteTextErrors = {
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type RewriteTextResponse = RewriteTextResponses[keyof RewriteTextResponses];

export declare type RewriteTextResponses = {
    /**
     * Rewritten text
     */
    200: {
        rewrittenText?: string;
    };
};

/**
 * Run a named database cleanup
 */
export declare const runAdminMaintenance: <ThrowOnError extends boolean = false>(options: Options<RunAdminMaintenanceData, ThrowOnError>) => RequestResult<RunAdminMaintenanceResponses, RunAdminMaintenanceErrors, ThrowOnError>;

export declare type RunAdminMaintenanceData = {
    body: {
        /**
         * A maintenance action key from `GET /admin/database`.
         */
        action: string;
    };
    path?: never;
    query?: never;
    url: '/admin/database/maintenance';
};

export declare type RunAdminMaintenanceError = RunAdminMaintenanceErrors[keyof RunAdminMaintenanceErrors];

export declare type RunAdminMaintenanceErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type RunAdminMaintenanceResponse = RunAdminMaintenanceResponses[keyof RunAdminMaintenanceResponses];

export declare type RunAdminMaintenanceResponses = {
    /**
     * Result
     */
    200: {
        action?: string;
        [key: string]: unknown;
    };
};

/**
 * Save a config value
 *
 * Admin only.
 */
export declare const saveConfig: <ThrowOnError extends boolean = false>(options: Options<SaveConfigData, ThrowOnError>) => RequestResult<SaveConfigResponses, SaveConfigErrors, ThrowOnError>;

export declare type SaveConfigData = {
    body: {
        key: string;
        value: string;
    };
    path?: never;
    query?: never;
    url: '/config';
};

export declare type SaveConfigError = SaveConfigErrors[keyof SaveConfigErrors];

export declare type SaveConfigErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type SaveConfigResponse = SaveConfigResponses[keyof SaveConfigResponses];

export declare type SaveConfigResponses = {
    /**
     * Saved
     */
    200: MessageResponse;
};

/**
 * Save a chat message
 */
export declare const saveMessage: <ThrowOnError extends boolean = false>(options: Options<SaveMessageData, ThrowOnError>) => RequestResult<SaveMessageResponses, SaveMessageErrors, ThrowOnError>;

export declare type SaveMessageData = {
    body: {
        chatId: string;
        messageId: string;
        role: 'user' | 'assistant';
        content?: string;
        suggestions?: Array<string>;
        sources?: Array<{
            [key: string]: unknown;
        }>;
    };
    path?: never;
    query?: never;
    url: '/agent/messages';
};

export declare type SaveMessageError = SaveMessageErrors[keyof SaveMessageErrors];

export declare type SaveMessageErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type SaveMessageResponse = SaveMessageResponses[keyof SaveMessageResponses];

export declare type SaveMessageResponses = {
    /**
     * Saved
     */
    200: MessageResponse;
};

/**
 * Create or update a playlist
 *
 * Creates the playlist when `id` is new (201), otherwise updates it (owner or editor).
 */
export declare const savePlaylist: <ThrowOnError extends boolean = false>(options: Options<SavePlaylistData, ThrowOnError>) => RequestResult<SavePlaylistResponses, SavePlaylistErrors, ThrowOnError>;

export declare type SavePlaylistData = {
    body: Playlist;
    path: {
        id: string;
    };
    query?: never;
    url: '/learn/playlists/{id}';
};

export declare type SavePlaylistError = SavePlaylistErrors[keyof SavePlaylistErrors];

export declare type SavePlaylistErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Conflicts with the current state
     */
    409: ErrorResponse;
    /**
     * Body too large
     */
    413: ErrorResponse;
};

export declare type SavePlaylistResponse = SavePlaylistResponses[keyof SavePlaylistResponses];

export declare type SavePlaylistResponses = {
    /**
     * Playlist
     */
    200: {
        playlist: Playlist;
    };
    /**
     * Playlist
     */
    201: {
        playlist: Playlist;
    };
};

/**
 * Scrape a URL (GET)
 */
export declare const scrapeGet: <ThrowOnError extends boolean = false>(options: Options<ScrapeGetData, ThrowOnError>) => RequestResult<ScrapeGetResponses, unknown, ThrowOnError>;

export declare type ScrapeGetData = {
    body?: never;
    path?: never;
    query: {
        url: string;
        blockImages?: boolean;
        bypassCaptcha?: boolean;
        timeout?: number;
        format?: 'html' | 'json';
    };
    url: '/scraper';
};

export declare type ScrapeGetResponse = ScrapeGetResponses[keyof ScrapeGetResponses];

export declare type ScrapeGetResponses = {
    /**
     * Scraped content
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Scrape a URL (POST)
 */
export declare const scrapePost: <ThrowOnError extends boolean = false>(options: Options<ScrapePostData, ThrowOnError>) => RequestResult<ScrapePostResponses, unknown, ThrowOnError>;

export declare type ScrapePostData = {
    body: {
        url: string;
        blockImages?: boolean;
        bypassCaptcha?: boolean;
        timeout?: number;
        format?: 'html' | 'json';
    };
    path?: never;
    query?: never;
    url: '/scraper';
};

export declare type ScrapePostResponse = ScrapePostResponses[keyof ScrapePostResponses];

export declare type ScrapePostResponses = {
    /**
     * Scraped content
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Search chats by title
 */
export declare const searchChats: <ThrowOnError extends boolean = false>(options: Options<SearchChatsData, ThrowOnError>) => RequestResult<SearchChatsResponses, SearchChatsErrors, ThrowOnError>;

export declare type SearchChatsData = {
    body?: never;
    path?: never;
    query: {
        q: string;
    };
    url: '/agent/chats/search';
};

export declare type SearchChatsError = SearchChatsErrors[keyof SearchChatsErrors];

export declare type SearchChatsErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type SearchChatsResponse = SearchChatsResponses[keyof SearchChatsResponses];

export declare type SearchChatsResponses = {
    /**
     * Matching chats
     */
    200: {
        chats?: Array<Chat>;
    };
};

/**
 * Free-text filter.
 */
export declare type SearchQuery = string;

export declare type SearchResult = {
    title?: string;
    url?: string;
    content?: string;
    img_src?: string;
    engine?: string;
    parsed_url?: Array<string>;
};

/**
 * Enable or disable an agent skill (saved to the account)
 */
export declare const setAgentSkill: <ThrowOnError extends boolean = false>(options: Options<SetAgentSkillData, ThrowOnError>) => RequestResult<SetAgentSkillResponses, SetAgentSkillErrors, ThrowOnError>;

export declare type SetAgentSkillData = {
    body: SkillToggle;
    path?: never;
    query?: never;
    url: '/user/agent-skills';
};

export declare type SetAgentSkillError = SetAgentSkillErrors[keyof SetAgentSkillErrors];

export declare type SetAgentSkillErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type SetAgentSkillResponse = SetAgentSkillResponses[keyof SetAgentSkillResponses];

export declare type SetAgentSkillResponses = {
    /**
     * Done
     */
    200: MessageResponse;
};

/**
 * Share a chat
 */
export declare const shareChat: <ThrowOnError extends boolean = false>(options: Options<ShareChatData, ThrowOnError>) => RequestResult<ShareChatResponses, ShareChatErrors, ThrowOnError>;

export declare type ShareChatData = {
    body: {
        chatId: string;
    };
    path?: never;
    query?: never;
    url: '/agent/chats/share';
};

export declare type ShareChatError = ShareChatErrors[keyof ShareChatErrors];

export declare type ShareChatErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type ShareChatResponse = ShareChatResponses[keyof ShareChatResponses];

export declare type ShareChatResponses = {
    /**
     * Share URL
     */
    200: {
        success?: boolean;
        data?: {
            chatId?: string;
            shareUrl?: string;
        };
    };
};

/**
 * Create or retrieve a share token for a document
 */
export declare const shareDocument: <ThrowOnError extends boolean = false>(options: Options<ShareDocumentData, ThrowOnError>) => RequestResult<ShareDocumentResponses, unknown, ThrowOnError>;

export declare type ShareDocumentData = {
    body: {
        documentId: string;
    };
    path?: never;
    query?: never;
    url: '/doc/share';
};

export declare type ShareDocumentResponse = ShareDocumentResponses[keyof ShareDocumentResponses];

export declare type ShareDocumentResponses = {
    /**
     * Share info
     */
    200: {
        success?: boolean;
        data?: {
            shareId?: string;
            shareUrl?: string;
        };
    };
};

/**
 * Share a Google Doc
 */
export declare const shareGoogleDoc: <ThrowOnError extends boolean = false>(options: Options<ShareGoogleDocData, ThrowOnError>) => RequestResult<ShareGoogleDocResponses, unknown, ThrowOnError>;

export declare type ShareGoogleDocData = {
    body: {
        googleDocId: string;
        accessToken: string;
        refreshToken?: string;
        emailAddress?: string;
        role?: 'reader' | 'commenter' | 'writer';
        publicLink?: boolean;
    };
    path?: never;
    query?: never;
    url: '/doc/google-docs/share';
};

export declare type ShareGoogleDocResponse = ShareGoogleDocResponses[keyof ShareGoogleDocResponses];

export declare type ShareGoogleDocResponses = {
    /**
     * Share result
     */
    200: {
        [key: string]: unknown;
    };
};

export declare type SkillToggle = {
    skillId: string;
    enabled: boolean;
};

export declare type StorageInfo = {
    used?: number;
    quota?: number;
    remaining?: number;
    allowed?: boolean;
    usedMB?: number;
    quotaMB?: number;
    remainingMB?: number;
    percentage?: number;
};

/**
 * Submit an enterprise / white-label enquiry
 */
export declare const submitEnterpriseRequest: <ThrowOnError extends boolean = false>(options: Options<SubmitEnterpriseRequestData, ThrowOnError>) => RequestResult<SubmitEnterpriseRequestResponses, SubmitEnterpriseRequestErrors, ThrowOnError>;

export declare type SubmitEnterpriseRequestData = {
    body: {
        name: string;
        email: string;
        businessType: 'startup' | 'agency' | 'saas' | 'enterprise' | 'ecommerce' | 'other';
        teamSize: '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
        message?: string;
        consent?: boolean;
    };
    path?: never;
    query?: never;
    url: '/enterprise-request';
};

export declare type SubmitEnterpriseRequestError = SubmitEnterpriseRequestErrors[keyof SubmitEnterpriseRequestErrors];

export declare type SubmitEnterpriseRequestErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type SubmitEnterpriseRequestResponse = SubmitEnterpriseRequestResponses[keyof SubmitEnterpriseRequestResponses];

export declare type SubmitEnterpriseRequestResponses = {
    /**
     * Received
     */
    200: {
        [key: string]: unknown;
    };
};

export declare type SuccessResponse = {
    success: boolean;
};

/**
 * Get follow-up questions for a learning goal
 */
export declare const suggestLearningQuestions: <ThrowOnError extends boolean = false>(options: Options<SuggestLearningQuestionsData, ThrowOnError>) => RequestResult<SuggestLearningQuestionsResponses, SuggestLearningQuestionsErrors, ThrowOnError>;

export declare type SuggestLearningQuestionsData = {
    body: {
        goal: string;
    };
    path?: never;
    query?: never;
    url: '/learn/questions';
};

export declare type SuggestLearningQuestionsError = SuggestLearningQuestionsErrors[keyof SuggestLearningQuestionsErrors];

export declare type SuggestLearningQuestionsErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
};

export declare type SuggestLearningQuestionsResponse = SuggestLearningQuestionsResponses[keyof SuggestLearningQuestionsResponses];

export declare type SuggestLearningQuestionsResponses = {
    /**
     * Questions
     */
    200: {
        questions: Array<FollowUpQuestion>;
        mode: 'llm' | 'offline';
    };
};

/**
 * Synthesize speech from text
 *
 * Kokoro or Deepgram text-to-speech. Unlike `/agent/voice` there is no per-guest quota and no account lookup; the response is cacheable for a year.
 */
export declare const synthesizeSpeech: <ThrowOnError extends boolean = false>(options: Options<SynthesizeSpeechData, ThrowOnError>) => RequestResult<SynthesizeSpeechResponses, SynthesizeSpeechErrors, ThrowOnError>;

export declare type SynthesizeSpeechData = {
    body: {
        text: string;
        provider?: 'kokoro' | 'deepgram';
        voice?: string;
    };
    path?: never;
    query?: never;
    url: '/speech/tts';
};

export declare type SynthesizeSpeechError = SynthesizeSpeechErrors[keyof SynthesizeSpeechErrors];

export declare type SynthesizeSpeechErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type SynthesizeSpeechResponse = SynthesizeSpeechResponses[keyof SynthesizeSpeechResponses];

export declare type SynthesizeSpeechResponses = {
    /**
     * Audio
     */
    200: Blob | File;
};

/**
 * Test which models are available for a provider
 */
export declare const testModels: <ThrowOnError extends boolean = false>(options: Options<TestModelsData, ThrowOnError>) => RequestResult<TestModelsResponses, unknown, ThrowOnError>;

export declare type TestModelsData = {
    body: {
        providerType: string;
        apiKey: string;
        onlyFree?: boolean;
    };
    path?: never;
    query?: never;
    url: '/agent/test-models';
};

export declare type TestModelsResponse = TestModelsResponses[keyof TestModelsResponses];

export declare type TestModelsResponses = {
    /**
     * Test results
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Test whether search engines are working
 */
export declare const testSearchEngines: <ThrowOnError extends boolean = false>(options: Options<TestSearchEnginesData, ThrowOnError>) => RequestResult<TestSearchEnginesResponses, unknown, ThrowOnError>;

export declare type TestSearchEnginesData = {
    body: {
        engines: Array<string>;
    };
    path?: never;
    query?: never;
    url: '/search/engines/test';
};

export declare type TestSearchEnginesResponse = TestSearchEnginesResponses[keyof TestSearchEnginesResponses];

export declare type TestSearchEnginesResponses = {
    /**
     * Test results per engine
     */
    200: {
        results?: {
            [key: string]: {
                working?: boolean;
                error?: string;
            };
        };
    };
};

/**
 * Text-to-speech via Kokoro or Deepgram (10/day guest limit)
 */
export declare const textToSpeech: <ThrowOnError extends boolean = false>(options: Options<TextToSpeechData, ThrowOnError>) => RequestResult<TextToSpeechResponses, TextToSpeechErrors, ThrowOnError>;

export declare type TextToSpeechData = {
    body: {
        text: string;
        voice?: string;
        provider?: 'kokoro' | 'deepgram';
    };
    path?: never;
    query?: never;
    url: '/agent/voice';
};

export declare type TextToSpeechError = TextToSpeechErrors[keyof TextToSpeechErrors];

export declare type TextToSpeechErrors = {
    /**
     * Rate limit exceeded
     */
    429: {
        error?: string;
        rateLimited?: boolean;
    };
};

export declare type TextToSpeechResponse = TextToSpeechResponses[keyof TextToSpeechResponses];

export declare type TextToSpeechResponses = {
    /**
     * Audio binary
     */
    200: Blob | File;
};

/**
 * Enable or disable an MCP server
 */
export declare const toggleMcpServer: <ThrowOnError extends boolean = false>(options: Options<ToggleMcpServerData, ThrowOnError>) => RequestResult<ToggleMcpServerResponses, unknown, ThrowOnError>;

export declare type ToggleMcpServerData = {
    body: {
        enabled: boolean;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/mcpservers/{id}/toggle';
};

export declare type ToggleMcpServerResponse = ToggleMcpServerResponses[keyof ToggleMcpServerResponses];

export declare type ToggleMcpServerResponses = {
    /**
     * Updated server
     */
    200: {
        server?: McpServer;
    };
};

/**
 * Enable or disable a skill
 */
export declare const toggleSkill: <ThrowOnError extends boolean = false>(options: Options<ToggleSkillData, ThrowOnError>) => RequestResult<ToggleSkillResponses, ToggleSkillErrors, ThrowOnError>;

export declare type ToggleSkillData = {
    body: SkillToggle;
    path?: never;
    query?: never;
    url: '/user/enabled-skills';
};

export declare type ToggleSkillError = ToggleSkillErrors[keyof ToggleSkillErrors];

export declare type ToggleSkillErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ToggleSkillResponse = ToggleSkillResponses[keyof ToggleSkillResponses];

export declare type ToggleSkillResponses = {
    /**
     * Updated
     */
    200: {
        message?: string;
        skillId?: string;
        enabled?: boolean;
    };
};

/**
 * Enable or disable several skills
 */
export declare const toggleSkills: <ThrowOnError extends boolean = false>(options: Options<ToggleSkillsData, ThrowOnError>) => RequestResult<ToggleSkillsResponses, ToggleSkillsErrors, ThrowOnError>;

export declare type ToggleSkillsData = {
    body: {
        updates: Array<SkillToggle>;
    };
    path?: never;
    query?: never;
    url: '/user/enabled-skills/batch';
};

export declare type ToggleSkillsError = ToggleSkillsErrors[keyof ToggleSkillsErrors];

export declare type ToggleSkillsErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type ToggleSkillsResponse = ToggleSkillsResponses[keyof ToggleSkillsResponses];

export declare type ToggleSkillsResponses = {
    /**
     * Updated
     */
    200: {
        message?: string;
        results?: Array<SkillToggle>;
    };
};

/**
 * Transcribe audio via Whisper (Cloudflare Workers AI)
 */
export declare const transcribeAudio: <ThrowOnError extends boolean = false>(options: Options<TranscribeAudioData, ThrowOnError>) => RequestResult<TranscribeAudioResponses, unknown, ThrowOnError>;

export declare type TranscribeAudioData = {
    body: {
        file: Blob | File;
        model?: 'small' | 'fast' | 'medium' | 'turbo' | 'large';
    };
    path?: never;
    query?: never;
    url: '/agent/transcript';
};

export declare type TranscribeAudioResponse = TranscribeAudioResponses[keyof TranscribeAudioResponses];

export declare type TranscribeAudioResponses = {
    /**
     * Transcript
     */
    200: {
        text?: string;
        model?: string;
    };
};

/**
 * Save news settings, or run refresh / prune / diagnose
 *
 * A body with `action` runs it; otherwise the named settings fields are saved (partial update) to D1.
 */
export declare const updateAdminNews: <ThrowOnError extends boolean = false>(options: Options<UpdateAdminNewsData, ThrowOnError>) => RequestResult<UpdateAdminNewsResponses, UpdateAdminNewsErrors, ThrowOnError>;

export declare type UpdateAdminNewsData = {
    body: {
        action: 'refresh' | 'prune' | 'diagnose';
    } | {
        enabled?: boolean;
        defaultTopics?: string;
        allowUserTopics?: boolean;
        maxTopics?: number;
        showImages?: boolean;
        cacheMinutes?: number;
        retentionDays?: number;
    };
    path?: never;
    query?: never;
    url: '/admin/news';
};

export declare type UpdateAdminNewsError = UpdateAdminNewsErrors[keyof UpdateAdminNewsErrors];

export declare type UpdateAdminNewsErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Internal server error
     */
    500: ErrorResponse;
};

export declare type UpdateAdminNewsResponse = UpdateAdminNewsResponses[keyof UpdateAdminNewsResponses];

export declare type UpdateAdminNewsResponses = {
    /**
     * Saved settings or action result
     */
    200: {
        [key: string]: unknown;
    };
};

/**
 * Update a row
 *
 * Only the registry-approved columns are written; everything else in the body is dropped.
 */
export declare const updateAdminTableRow: <ThrowOnError extends boolean = false>(options: Options<UpdateAdminTableRowData, ThrowOnError>) => RequestResult<UpdateAdminTableRowResponses, UpdateAdminTableRowErrors, ThrowOnError>;

export declare type UpdateAdminTableRowData = {
    body: {
        [key: string]: unknown;
    };
    path: {
        table: string;
        id: string;
    };
    query?: never;
    url: '/admin/database/{table}/{id}';
};

export declare type UpdateAdminTableRowError = UpdateAdminTableRowErrors[keyof UpdateAdminTableRowErrors];

export declare type UpdateAdminTableRowErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type UpdateAdminTableRowResponse = UpdateAdminTableRowResponses[keyof UpdateAdminTableRowResponses];

export declare type UpdateAdminTableRowResponses = {
    /**
     * Updated row
     */
    200: {
        row?: {
            [key: string]: unknown;
        };
    };
};

/**
 * Update a user
 */
export declare const updateAdminUser: <ThrowOnError extends boolean = false>(options: Options<UpdateAdminUserData, ThrowOnError>) => RequestResult<UpdateAdminUserResponses, UpdateAdminUserErrors, ThrowOnError>;

export declare type UpdateAdminUserData = {
    /**
     * Only these fields are written.
     */
    body: {
        name?: string;
        trialAllowed?: boolean;
        storageQuotaBytes?: number;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/admin/users/{id}';
};

export declare type UpdateAdminUserError = UpdateAdminUserErrors[keyof UpdateAdminUserErrors];

export declare type UpdateAdminUserErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Signed in, but not allowed to do this
     */
    403: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type UpdateAdminUserResponse = UpdateAdminUserResponses[keyof UpdateAdminUserResponses];

export declare type UpdateAdminUserResponses = {
    /**
     * Updated
     */
    200: {
        user?: {
            [key: string]: unknown;
        };
    };
};

/**
 * Store article Q&A or follow-up questions
 */
export declare const updateArticle: <ThrowOnError extends boolean = false>(options: Options<UpdateArticleData, ThrowOnError>) => RequestResult<UpdateArticleResponses, UpdateArticleErrors, ThrowOnError>;

export declare type UpdateArticleData = {
    body: {
        url: string;
        question?: string;
        answer?: string;
        followUpQuestions?: Array<string>;
    };
    path?: never;
    query?: never;
    url: '/doc/article';
};

export declare type UpdateArticleError = UpdateArticleErrors[keyof UpdateArticleErrors];

export declare type UpdateArticleErrors = {
    /**
     * Bad request
     */
    400: ErrorResponse;
};

export declare type UpdateArticleResponse = UpdateArticleResponses[keyof UpdateArticleResponses];

export declare type UpdateArticleResponses = {
    /**
     * Stored
     */
    200: {
        success?: boolean;
    };
};

/**
 * Update a document
 */
export declare const updateDocument: <ThrowOnError extends boolean = false>(options: Options<UpdateDocumentData, ThrowOnError>) => RequestResult<UpdateDocumentResponses, UpdateDocumentErrors, ThrowOnError>;

export declare type UpdateDocumentData = {
    body: {
        title?: string;
        content?: string;
        parentId?: number;
        isExpanded?: boolean;
        metadata?: {
            [key: string]: unknown;
        };
        name?: string;
    };
    path: {
        id: number;
    };
    query?: never;
    url: '/doc/documents/{id}';
};

export declare type UpdateDocumentError = UpdateDocumentErrors[keyof UpdateDocumentErrors];

export declare type UpdateDocumentErrors = {
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type UpdateDocumentResponse = UpdateDocumentResponses[keyof UpdateDocumentResponses];

export declare type UpdateDocumentResponses = {
    /**
     * Updated document
     */
    200: Document_2;
};

/**
 * Update enabled search engines
 */
export declare const updateEngineStatus: <ThrowOnError extends boolean = false>(options: Options<UpdateEngineStatusData, ThrowOnError>) => RequestResult<UpdateEngineStatusResponses, unknown, ThrowOnError>;

export declare type UpdateEngineStatusData = {
    body: {
        enabledEngines: Array<string>;
    };
    path?: never;
    query?: never;
    url: '/search/engines/status';
};

export declare type UpdateEngineStatusResponse = UpdateEngineStatusResponses[keyof UpdateEngineStatusResponses];

export declare type UpdateEngineStatusResponses = {
    /**
     * Updated
     */
    200: MessageResponse;
};

/**
 * Update an MCP server
 */
export declare const updateMcpServer: <ThrowOnError extends boolean = false>(options: Options<UpdateMcpServerData, ThrowOnError>) => RequestResult<UpdateMcpServerResponses, unknown, ThrowOnError>;

export declare type UpdateMcpServerData = {
    body: {
        name?: string;
        config?: {
            [key: string]: unknown;
        };
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/mcpservers/{id}';
};

export declare type UpdateMcpServerResponse = UpdateMcpServerResponses[keyof UpdateMcpServerResponses];

export declare type UpdateMcpServerResponses = {
    /**
     * Updated server
     */
    200: {
        server?: McpServer;
    };
};

/**
 * Update a memory
 */
export declare const updateMemory: <ThrowOnError extends boolean = false>(options: Options<UpdateMemoryData, ThrowOnError>) => RequestResult<UpdateMemoryResponses, UpdateMemoryErrors, ThrowOnError>;

export declare type UpdateMemoryData = {
    body: {
        name?: string;
        description?: string;
        importance?: number;
        tags?: Array<string>;
        metadata?: {
            [key: string]: unknown;
        };
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/user/memories/{id}';
};

export declare type UpdateMemoryError = UpdateMemoryErrors[keyof UpdateMemoryErrors];

export declare type UpdateMemoryErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
    /**
     * Not found
     */
    404: ErrorResponse;
};

export declare type UpdateMemoryResponse = UpdateMemoryResponses[keyof UpdateMemoryResponses];

export declare type UpdateMemoryResponses = {
    /**
     * Updated
     */
    200: {
        message?: string;
        memory?: Memory;
    };
};

/**
 * Update a provider
 */
export declare const updateProvider: <ThrowOnError extends boolean = false>(options: Options<UpdateProviderData, ThrowOnError>) => RequestResult<UpdateProviderResponses, unknown, ThrowOnError>;

export declare type UpdateProviderData = {
    body: {
        config?: {
            [key: string]: unknown;
        };
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/agent/providers/{id}';
};

export declare type UpdateProviderResponse = UpdateProviderResponses[keyof UpdateProviderResponses];

export declare type UpdateProviderResponses = {
    /**
     * Updated provider
     */
    200: {
        provider?: Provider;
    };
};

/**
 * Update a quote
 */
export declare const updateQuote: <ThrowOnError extends boolean = false>(options: Options<UpdateQuoteData, ThrowOnError>) => RequestResult<UpdateQuoteResponses, unknown, ThrowOnError>;

export declare type UpdateQuoteData = {
    body: {
        text: string;
        source?: string;
        author?: string;
        url?: string;
        pageNumber?: number;
        tags?: Array<string>;
    };
    path: {
        id: string;
    };
    query?: never;
    url: '/doc/quotes/{id}';
};

export declare type UpdateQuoteResponse = UpdateQuoteResponses[keyof UpdateQuoteResponses];

export declare type UpdateQuoteResponses = {
    /**
     * Updated
     */
    200: {
        success?: boolean;
        data?: Quote;
    };
};

/**
 * Update user profile
 */
export declare const updateUser: <ThrowOnError extends boolean = false>(options: Options<UpdateUserData, ThrowOnError>) => RequestResult<UpdateUserResponses, UpdateUserErrors, ThrowOnError>;

export declare type UpdateUserData = {
    body: {
        name?: string;
        email?: string;
        image?: string;
        regenerateApiKey?: boolean;
    };
    path?: never;
    query?: never;
    url: '/user';
};

export declare type UpdateUserError = UpdateUserErrors[keyof UpdateUserErrors];

export declare type UpdateUserErrors = {
    /**
     * Authentication required
     */
    401: ErrorResponse;
};

export declare type UpdateUserResponse = UpdateUserResponses[keyof UpdateUserResponses];

export declare type UpdateUserResponses = {
    /**
     * Updated
     */
    200: MessageResponse;
};

export declare type UploadedFile = {
    fileName?: string;
    fileExtension?: string;
    fileId?: string;
    sizeBytes?: number;
};

/**
 * Upload files to Cloudflare R2 (PDF, DOCX, TXT, HTML)
 */
export declare const uploadFiles: <ThrowOnError extends boolean = false>(options: Options<UploadFilesData, ThrowOnError>) => RequestResult<UploadFilesResponses, unknown, ThrowOnError>;

export declare type UploadFilesData = {
    body: {
        files: Array<Blob | File>;
    };
    path?: never;
    query?: never;
    url: '/doc/uploads';
};

export declare type UploadFilesResponse = UploadFilesResponses[keyof UploadFilesResponses];

export declare type UploadFilesResponses = {
    /**
     * Uploaded files
     */
    200: {
        files?: Array<UploadedFile>;
    };
};

export declare type UserProfile = {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
    apiKey?: string;
    createdAt?: string;
};

export declare type UserSession = {
    id?: string;
    token?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt?: string;
    expiresAt?: string;
    isCurrent?: boolean;
};

export { }
