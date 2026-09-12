import { Client } from './client';
import { Options as Options_2 } from './client';
import { RequestResult } from './client';
import { TDataShape } from './client';

/**
 * Add a favorite
 */
export declare const addFavorite: <ThrowOnError extends boolean = false>(options: Options<AddFavoriteData, ThrowOnError>) => RequestResult<AddFavoriteResponses, AddFavoriteErrors, ThrowOnError, "fields">;

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
export declare const addMcpServer: <ThrowOnError extends boolean = false>(options: Options<AddMcpServerData, ThrowOnError>) => RequestResult<AddMcpServerResponses, unknown, ThrowOnError, "fields">;

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
export declare const addNotebookSource: <ThrowOnError extends boolean = false>(options: Options<AddNotebookSourceData, ThrowOnError>) => RequestResult<AddNotebookSourceResponses, AddNotebookSourceErrors, ThrowOnError, "fields">;

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
export declare const addProvider: <ThrowOnError extends boolean = false>(options: Options<AddProviderData, ThrowOnError>) => RequestResult<AddProviderResponses, unknown, ThrowOnError, "fields">;

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
export declare const addProviderModel: <ThrowOnError extends boolean = false>(options: Options<AddProviderModelData, ThrowOnError>) => RequestResult<AddProviderModelResponses, unknown, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
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
export declare const agentChat: <ThrowOnError extends boolean = false>(options: Options<AgentChatData, ThrowOnError>) => Promise< ServerSentEventsResult<AgentChatResponses, AgentChatErrors>>;

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
export declare const agentSearch: <ThrowOnError extends boolean = false>(options: Options<AgentSearchData, ThrowOnError>) => RequestResult<AgentSearchResponses, AgentSearchErrors, ThrowOnError, "fields">;

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
export declare const articleFollowups: <ThrowOnError extends boolean = false>(options: Options<ArticleFollowupsData, ThrowOnError>) => RequestResult<ArticleFollowupsResponses, ArticleFollowupsErrors, ThrowOnError, "fields">;

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
export declare const articleQa: <ThrowOnError extends boolean = false>(options: Options<ArticleQaData, ThrowOnError>) => RequestResult<ArticleQaResponses, ArticleQaErrors, ThrowOnError, "fields">;

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
export declare const askNotebook: <ThrowOnError extends boolean = false>(options: Options<AskNotebookData, ThrowOnError>) => RequestResult<AskNotebookResponses, AskNotebookErrors, ThrowOnError, "fields">;

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
export declare const autocomplete: <ThrowOnError extends boolean = false>(options: Options<AutocompleteData, ThrowOnError>) => RequestResult<AutocompleteResponses, unknown, ThrowOnError, "fields">;

export declare type AutocompleteData = {
    body?: never;
    path?: never;
    query: {
        q: string;
        locale?: string;
        /**
         * Comma-separated: google, ddg, wikipedia
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
export declare const changePassword: <ThrowOnError extends boolean = false>(options: Options<ChangePasswordData, ThrowOnError>) => RequestResult<ChangePasswordResponses, ChangePasswordErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
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

export declare type ClientOptions = {
    baseUrl: 'https://qwksearch.com/api' | (string & {});
};

/**
 * Create a document
 */
export declare const createDocument: <ThrowOnError extends boolean = false>(options: Options<CreateDocumentData, ThrowOnError>) => RequestResult<CreateDocumentResponses, unknown, ThrowOnError, "fields">;

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
 * Create a notebook
 */
export declare const createNotebook: <ThrowOnError extends boolean = false>(options: Options<CreateNotebookData, ThrowOnError>) => RequestResult<CreateNotebookResponses, CreateNotebookErrors, ThrowOnError, "fields">;

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
export declare const createQuote: <ThrowOnError extends boolean = false>(options: Options<CreateQuoteData, ThrowOnError>) => RequestResult<CreateQuoteResponses, unknown, ThrowOnError, "fields">;

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
 * Delete all user chats
 */
export declare const deleteAllChats: <ThrowOnError extends boolean = false>(options?: Options<DeleteAllChatsData, ThrowOnError>) => RequestResult<DeleteAllChatsResponses, DeleteAllChatsErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Delete a chat
 */
export declare const deleteChatById: <ThrowOnError extends boolean = false>(options: Options<DeleteChatByIdData, ThrowOnError>) => RequestResult<DeleteChatByIdResponses, DeleteChatByIdErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Delete a document
 */
export declare const deleteDocument: <ThrowOnError extends boolean = false>(options: Options<DeleteDocumentData, ThrowOnError>) => RequestResult<DeleteDocumentResponses, DeleteDocumentErrors, ThrowOnError, "fields">;

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
export declare const deleteMcpServer: <ThrowOnError extends boolean = false>(options: Options<DeleteMcpServerData, ThrowOnError>) => RequestResult<DeleteMcpServerResponses, unknown, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Delete a notebook
 */
export declare const deleteNotebook: <ThrowOnError extends boolean = false>(options: Options<DeleteNotebookData, ThrowOnError>) => RequestResult<DeleteNotebookResponses, DeleteNotebookErrors, ThrowOnError, "fields">;

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
 * Delete a provider
 */
export declare const deleteProvider: <ThrowOnError extends boolean = false>(options: Options<DeleteProviderData, ThrowOnError>) => RequestResult<DeleteProviderResponses, unknown, ThrowOnError, "fields">;

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
export declare const deleteProviderModel: <ThrowOnError extends boolean = false>(options: Options<DeleteProviderModelData, ThrowOnError>) => RequestResult<DeleteProviderModelResponses, unknown, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

export declare type DeleteProviderResponse = DeleteProviderResponses[keyof DeleteProviderResponses];

export declare type DeleteProviderResponses = {
    /**
     * Deleted
     */
    200: {
        message?: string;
    };
};

/**
 * Delete a quote
 */
export declare const deleteQuote: <ThrowOnError extends boolean = false>(options: Options<DeleteQuoteData, ThrowOnError>) => RequestResult<DeleteQuoteResponses, unknown, ThrowOnError, "fields">;

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
export declare const deleteUploadedFile: <ThrowOnError extends boolean = false>(options: Options<DeleteUploadedFileData, ThrowOnError>) => RequestResult<DeleteUploadedFileResponses, unknown, ThrowOnError, "fields">;

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
export declare const deleteUser: <ThrowOnError extends boolean = false>(options?: Options<DeleteUserData, ThrowOnError>) => RequestResult<DeleteUserResponses, DeleteUserErrors, ThrowOnError, "fields">;

/**
 * Unlink an OAuth account
 */
export declare const deleteUserAccount: <ThrowOnError extends boolean = false>(options: Options<DeleteUserAccountData, ThrowOnError>) => RequestResult<DeleteUserAccountResponses, DeleteUserAccountErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Disconnect NotebookLM
 */
export declare const disconnectNotebooklm: <ThrowOnError extends boolean = false>(options?: Options<DisconnectNotebooklmData, ThrowOnError>) => RequestResult<DisconnectNotebooklmResponses, DisconnectNotebooklmErrors, ThrowOnError, "fields">;

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
export declare const discoverContent: <ThrowOnError extends boolean = false>(options?: Options<DiscoverContentData, ThrowOnError>) => RequestResult<DiscoverContentResponses, DiscoverContentErrors, ThrowOnError, "fields">;

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

export declare type ErrorResponse = {
    error?: string;
    message?: string;
};

/**
 * Export document to Google Docs
 */
export declare const exportToGoogleDocs: <ThrowOnError extends boolean = false>(options: Options<ExportToGoogleDocsData, ThrowOnError>) => RequestResult<ExportToGoogleDocsResponses, unknown, ThrowOnError, "fields">;

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

/**
 * Generate audio overview for a notebook
 */
export declare const generateNotebookAudio: <ThrowOnError extends boolean = false>(options: Options<GenerateNotebookAudioData, ThrowOnError>) => RequestResult<GenerateNotebookAudioResponses, GenerateNotebookAudioErrors, ThrowOnError, "fields">;

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
 * Generate follow-up suggestions for a chat
 */
export declare const generateSuggestions: <ThrowOnError extends boolean = false>(options: Options<GenerateSuggestionsData, ThrowOnError>) => RequestResult<GenerateSuggestionsResponses, GenerateSuggestionsErrors, ThrowOnError, "fields">;

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
 * Fetch and cache article from URL
 */
export declare const getArticle: <ThrowOnError extends boolean = false>(options: Options<GetArticleData, ThrowOnError>) => RequestResult<GetArticleResponses, GetArticleErrors, ThrowOnError, "fields">;

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
export declare const getChatById: <ThrowOnError extends boolean = false>(options: Options<GetChatByIdData, ThrowOnError>) => RequestResult<GetChatByIdResponses, GetChatByIdErrors, ThrowOnError, "fields">;

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
 * Get application configuration
 */
export declare const getConfig: <ThrowOnError extends boolean = false>(options?: Options<GetConfigData, ThrowOnError>) => RequestResult<GetConfigResponses, unknown, ThrowOnError, "fields">;

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
 * Get a document by ID
 */
export declare const getDocumentById: <ThrowOnError extends boolean = false>(options: Options<GetDocumentByIdData, ThrowOnError>) => RequestResult<GetDocumentByIdResponses, GetDocumentByIdErrors, ThrowOnError, "fields">;

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
export declare const getEngineStatus: <ThrowOnError extends boolean = false>(options?: Options<GetEngineStatusData, ThrowOnError>) => RequestResult<GetEngineStatusResponses, unknown, ThrowOnError, "fields">;

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
 * Download a Google Drive file by ID
 */
export declare const getGoogleDriveFile: <ThrowOnError extends boolean = false>(options: Options<GetGoogleDriveFileData, ThrowOnError>) => RequestResult<GetGoogleDriveFileResponses, unknown, ThrowOnError, "fields">;

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
 * Get Google access token from cookies
 */
export declare const getGoogleToken: <ThrowOnError extends boolean = false>(options?: Options<GetGoogleTokenData, ThrowOnError>) => RequestResult<GetGoogleTokenResponses, unknown, ThrowOnError, "fields">;

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
 * Get NotebookLM connection status
 */
export declare const getNotebooklmStatus: <ThrowOnError extends boolean = false>(options?: Options<GetNotebooklmStatusData, ThrowOnError>) => RequestResult<GetNotebooklmStatusResponses, GetNotebooklmStatusErrors, ThrowOnError, "fields">;

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
 * Resolve a share token to a document
 */
export declare const getSharedDocument: <ThrowOnError extends boolean = false>(options: Options<GetSharedDocumentData, ThrowOnError>) => RequestResult<GetSharedDocumentResponses, GetSharedDocumentErrors, ThrowOnError, "fields">;

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
 * Get extracted content for an uploaded file
 */
export declare const getUploadedFile: <ThrowOnError extends boolean = false>(options: Options<GetUploadedFileData, ThrowOnError>) => RequestResult<GetUploadedFileResponses, unknown, ThrowOnError, "fields">;

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
export declare const getUser: <ThrowOnError extends boolean = false>(options?: Options<GetUserData, ThrowOnError>) => RequestResult<GetUserResponses, GetUserErrors, ThrowOnError, "fields">;

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
export declare const getUserStorage: <ThrowOnError extends boolean = false>(options?: Options<GetUserStorageData, ThrowOnError>) => RequestResult<GetUserStorageResponses, GetUserStorageErrors, ThrowOnError, "fields">;

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
export declare const googleDocsAuth: <ThrowOnError extends boolean = false>(options?: Options<GoogleDocsAuthData, ThrowOnError>) => RequestResult<GoogleDocsAuthResponses, unknown, ThrowOnError, "fields">;

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
export declare const googleDocsAuthStatus: <ThrowOnError extends boolean = false>(options?: Options<GoogleDocsAuthStatusData, ThrowOnError>) => RequestResult<GoogleDocsAuthStatusResponses, unknown, ThrowOnError, "fields">;

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
export declare const googleDocsCallback: <ThrowOnError extends boolean = false>(options: Options<GoogleDocsCallbackData, ThrowOnError>) => RequestResult<GoogleDocsCallbackResponses, unknown, ThrowOnError, "fields">;

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

/**
 * Import a Google Docs document
 */
export declare const importFromGoogleDocs: <ThrowOnError extends boolean = false>(options: Options<ImportFromGoogleDocsData, ThrowOnError>) => RequestResult<ImportFromGoogleDocsResponses, unknown, ThrowOnError, "fields">;

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

/**
 * List user's chats
 */
export declare const listChats: <ThrowOnError extends boolean = false>(options?: Options<ListChatsData, ThrowOnError>) => RequestResult<ListChatsResponses, ListChatsErrors, ThrowOnError, "fields">;

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
export declare const listDocuments: <ThrowOnError extends boolean = false>(options?: Options<ListDocumentsData, ThrowOnError>) => RequestResult<ListDocumentsResponses, unknown, ThrowOnError, "fields">;

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
 * List favorites
 */
export declare const listFavorites: <ThrowOnError extends boolean = false>(options?: Options<ListFavoritesData, ThrowOnError>) => RequestResult<ListFavoritesResponses, ListFavoritesErrors, ThrowOnError, "fields">;

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
 * List MCP servers
 */
export declare const listMcpServers: <ThrowOnError extends boolean = false>(options?: Options<ListMcpServersData, ThrowOnError>) => RequestResult<ListMcpServersResponses, unknown, ThrowOnError, "fields">;

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
 * List notebooks
 */
export declare const listNotebooks: <ThrowOnError extends boolean = false>(options?: Options<ListNotebooksData, ThrowOnError>) => RequestResult<ListNotebooksResponses, ListNotebooksErrors, ThrowOnError, "fields">;

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
export declare const listNotebookSources: <ThrowOnError extends boolean = false>(options: Options<ListNotebookSourcesData, ThrowOnError>) => RequestResult<ListNotebookSourcesResponses, ListNotebookSourcesErrors, ThrowOnError, "fields">;

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
 * List LLM providers
 */
export declare const listProviders: <ThrowOnError extends boolean = false>(options?: Options<ListProvidersData, ThrowOnError>) => RequestResult<ListProvidersResponses, unknown, ThrowOnError, "fields">;

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
export declare const listQuotes: <ThrowOnError extends boolean = false>(options: Options<ListQuotesData, ThrowOnError>) => RequestResult<ListQuotesResponses, ListQuotesErrors, ThrowOnError, "fields">;

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
export declare const listSearchEngines: <ThrowOnError extends boolean = false>(options?: Options<ListSearchEnginesData, ThrowOnError>) => RequestResult<ListSearchEnginesResponses, unknown, ThrowOnError, "fields">;

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
export declare const listSessions: <ThrowOnError extends boolean = false>(options?: Options<ListSessionsData, ThrowOnError>) => RequestResult<ListSessionsResponses, ListSessionsErrors, ThrowOnError, "fields">;

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
 * List linked OAuth accounts
 */
export declare const listUserAccounts: <ThrowOnError extends boolean = false>(options?: Options<ListUserAccountsData, ThrowOnError>) => RequestResult<ListUserAccountsResponses, ListUserAccountsErrors, ThrowOnError, "fields">;

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

export declare type ModelWithProvider = {
    providerId: string;
    key: string;
};

export declare type Notebook = {
    id?: string;
    title?: string;
    createdAt?: string;
};

/**
 * Connect NotebookLM with Google credentials
 */
export declare const notebooklmLogin: <ThrowOnError extends boolean = false>(options: Options<NotebooklmLoginData, ThrowOnError>) => RequestResult<NotebooklmLoginResponses, NotebooklmLoginErrors, ThrowOnError, "fields">;

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

export declare type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean> = Options_2<TData, ThrowOnError> & {
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
    meta?: Record<string, unknown>;
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
 * Refresh Google access token using stored refresh token
 */
export declare const refreshGoogleToken: <ThrowOnError extends boolean = false>(options?: Options<RefreshGoogleTokenData, ThrowOnError>) => RequestResult<RefreshGoogleTokenResponses, unknown, ThrowOnError, "fields">;

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
export declare const removeFavorite: <ThrowOnError extends boolean = false>(options: Options<RemoveFavoriteData, ThrowOnError>) => RequestResult<RemoveFavoriteResponses, RemoveFavoriteErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Revoke all other sessions
 */
export declare const revokeOtherSessions: <ThrowOnError extends boolean = false>(options?: Options<RevokeOtherSessionsData, ThrowOnError>) => RequestResult<RevokeOtherSessionsResponses, RevokeOtherSessionsErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Revoke a specific session
 */
export declare const revokeSession: <ThrowOnError extends boolean = false>(options: Options<RevokeSessionData, ThrowOnError>) => RequestResult<RevokeSessionResponses, RevokeSessionErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Rewrite text with AI (Groq)
 */
export declare const rewriteText: <ThrowOnError extends boolean = false>(options: Options<RewriteTextData, ThrowOnError>) => RequestResult<RewriteTextResponses, RewriteTextErrors, ThrowOnError, "fields">;

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
 * Save a config value
 */
export declare const saveConfig: <ThrowOnError extends boolean = false>(options: Options<SaveConfigData, ThrowOnError>) => RequestResult<SaveConfigResponses, unknown, ThrowOnError, "fields">;

export declare type SaveConfigData = {
    body: {
        key: string;
        value: string;
    };
    path?: never;
    query?: never;
    url: '/config';
};

export declare type SaveConfigResponse = SaveConfigResponses[keyof SaveConfigResponses];

export declare type SaveConfigResponses = {
    /**
     * Saved
     */
    200: {
        message?: string;
    };
};

/**
 * Save a chat message
 */
export declare const saveMessage: <ThrowOnError extends boolean = false>(options: Options<SaveMessageData, ThrowOnError>) => RequestResult<SaveMessageResponses, SaveMessageErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Scrape a URL (GET)
 */
export declare const scrapeGet: <ThrowOnError extends boolean = false>(options: Options<ScrapeGetData, ThrowOnError>) => RequestResult<ScrapeGetResponses, unknown, ThrowOnError, "fields">;

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
export declare const scrapePost: <ThrowOnError extends boolean = false>(options: Options<ScrapePostData, ThrowOnError>) => RequestResult<ScrapePostResponses, unknown, ThrowOnError, "fields">;

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
export declare const searchChats: <ThrowOnError extends boolean = false>(options: Options<SearchChatsData, ThrowOnError>) => RequestResult<SearchChatsResponses, SearchChatsErrors, ThrowOnError, "fields">;

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

export declare type SearchResult = {
    title?: string;
    url?: string;
    content?: string;
    img_src?: string;
    engine?: string;
    parsed_url?: Array<string>;
};

declare type ServerSentEventsResult<TData = unknown, TReturn = void, TNext = unknown> = {
    stream: AsyncGenerator<TData extends Record<string, unknown> ? TData[keyof TData] : TData, TReturn, TNext>;
};

/**
 * Share a chat
 */
export declare const shareChat: <ThrowOnError extends boolean = false>(options: Options<ShareChatData, ThrowOnError>) => RequestResult<ShareChatResponses, ShareChatErrors, ThrowOnError, "fields">;

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
export declare const shareDocument: <ThrowOnError extends boolean = false>(options: Options<ShareDocumentData, ThrowOnError>) => RequestResult<ShareDocumentResponses, unknown, ThrowOnError, "fields">;

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
export declare const shareGoogleDoc: <ThrowOnError extends boolean = false>(options: Options<ShareGoogleDocData, ThrowOnError>) => RequestResult<ShareGoogleDocResponses, unknown, ThrowOnError, "fields">;

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
 * Test which models are available for a provider
 */
export declare const testModels: <ThrowOnError extends boolean = false>(options: Options<TestModelsData, ThrowOnError>) => RequestResult<TestModelsResponses, unknown, ThrowOnError, "fields">;

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
export declare const testSearchEngines: <ThrowOnError extends boolean = false>(options: Options<TestSearchEnginesData, ThrowOnError>) => RequestResult<TestSearchEnginesResponses, unknown, ThrowOnError, "fields">;

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
export declare const textToSpeech: <ThrowOnError extends boolean = false>(options: Options<TextToSpeechData, ThrowOnError>) => RequestResult<TextToSpeechResponses, TextToSpeechErrors, ThrowOnError, "fields">;

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
export declare const toggleMcpServer: <ThrowOnError extends boolean = false>(options: Options<ToggleMcpServerData, ThrowOnError>) => RequestResult<ToggleMcpServerResponses, unknown, ThrowOnError, "fields">;

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
 * Transcribe audio via Whisper (Cloudflare Workers AI)
 */
export declare const transcribeAudio: <ThrowOnError extends boolean = false>(options: Options<TranscribeAudioData, ThrowOnError>) => RequestResult<TranscribeAudioResponses, unknown, ThrowOnError, "fields">;

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
 * Store article Q&A or follow-up questions
 */
export declare const updateArticle: <ThrowOnError extends boolean = false>(options: Options<UpdateArticleData, ThrowOnError>) => RequestResult<UpdateArticleResponses, UpdateArticleErrors, ThrowOnError, "fields">;

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
export declare const updateDocument: <ThrowOnError extends boolean = false>(options: Options<UpdateDocumentData, ThrowOnError>) => RequestResult<UpdateDocumentResponses, UpdateDocumentErrors, ThrowOnError, "fields">;

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
export declare const updateEngineStatus: <ThrowOnError extends boolean = false>(options: Options<UpdateEngineStatusData, ThrowOnError>) => RequestResult<UpdateEngineStatusResponses, unknown, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
};

/**
 * Update an MCP server
 */
export declare const updateMcpServer: <ThrowOnError extends boolean = false>(options: Options<UpdateMcpServerData, ThrowOnError>) => RequestResult<UpdateMcpServerResponses, unknown, ThrowOnError, "fields">;

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
 * Update a provider
 */
export declare const updateProvider: <ThrowOnError extends boolean = false>(options: Options<UpdateProviderData, ThrowOnError>) => RequestResult<UpdateProviderResponses, unknown, ThrowOnError, "fields">;

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
export declare const updateQuote: <ThrowOnError extends boolean = false>(options: Options<UpdateQuoteData, ThrowOnError>) => RequestResult<UpdateQuoteResponses, unknown, ThrowOnError, "fields">;

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
export declare const updateUser: <ThrowOnError extends boolean = false>(options: Options<UpdateUserData, ThrowOnError>) => RequestResult<UpdateUserResponses, UpdateUserErrors, ThrowOnError, "fields">;

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
    200: {
        message?: string;
    };
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
export declare const uploadFiles: <ThrowOnError extends boolean = false>(options: Options<UploadFilesData, ThrowOnError>) => RequestResult<UploadFilesResponses, unknown, ThrowOnError, "fields">;

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
