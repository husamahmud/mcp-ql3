import { Octokit } from '@octokit/rest';
import { environment } from '@/config/environment';

if (!environment.github.token) {
  throw new Error('GitHub token is required');
}

export const github = new Octokit({
  auth: environment.github.token,
});

export default github;
