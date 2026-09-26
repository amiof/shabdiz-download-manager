export type GithubUser ={
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  user_view_type: string
  site_admin: boolean
}

export type GithubReleaseAsset ={
  url: string
  id: number
  node_id: string
  name: string
  label: string
  uploader: GithubUser
  content_type: string
  state: string
  size: number
  digest: string
  download_count: number
  created_at: string
  updated_at: string
  browser_download_url: string
}

export type  GithubRelease = {
  url: string
  assets_url: string
  upload_url: string
  html_url: string

  id: number

  author: GithubUser

  node_id: string

  tag_name: string
  target_commitish: string
  name: string

  draft: boolean
  immutable: boolean
  prerelease: boolean

  created_at: string
  updated_at: string
  published_at: string

  assets: GithubReleaseAsset[]
}
export type ytDlpInfoData={
  tag_name:string,
  html_url : string,
  linux_asset: GithubReleaseAsset | undefined,
  winAsset: GithubReleaseAsset | undefined,
  macAsset: GithubReleaseAsset | undefined,
}