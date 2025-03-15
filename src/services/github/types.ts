export type GitHubApiOptions = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

export type GitHubRepositoryResponse = {
  html_url: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
}

export type GitHubFileContentResponse = {
  content: string;
  encoding: string;
  sha: string;
  path: string;
}

export type GitHubIssueResponse = {
  html_url: string;
  number: number;
  title: string;
  state: string;
}

export type GitHubPullRequestResponse = {
  html_url: string;
  number: number;
  title: string;
  state: string;
}

export type GitHubCommitResponse = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export type GitHubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepositoryResponse[];
}

export type GitHubError = {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
