# 2026年9月 ブランチ整理記録

v0.8の公開コードは `fbefad970abb1eb05473e161803ed3f062758427` です。このコミットに `v0.8` タグを付けてGitHub Releaseに記録します。

旧作業ブランチは、削除前に同じコミットを指す `archive/<旧ブランチ名>` タグを作成して保管します。整理後の作業の基点は `main` です。独自の試作コードを現行版へ混ぜるためのマージは行いません。

| 旧ブランチ | 保管タグ | 保管コミット | 整理理由 |
| --- | --- | --- | --- |
| `feature/water-v07` | `archive/feature/water-v07` | `1b31b25a9b082b08969226782ef6203d44eb45d2` | v0.7以前の調査・試作。独自の診断コードを含むためタグで保管。 |
| `preview/layout-water-v0.8` | `archive/preview/layout-water-v0.8` | `e2d56ab9f6f72f63486bfdbe7d6cd0e035ffbc34` | v0.8の作業履歴。mainに取り込み済み。 |
| `preview/release-v0.7.1` | `archive/preview/release-v0.7.1` | `905c25d4f2f1a2d46b7efef31c3650c074b99001` | v0.7作業ブランチの祖先。後続のv0.7に統合済み。 |
| `preview/v0.6` | `archive/preview/v0.6` | `c94d1f97dbb6f4997866eebbb43c41fce75245ce` | mainの祖先。初期版の履歴。 |
| `preview/v0.7-water-camera` | `archive/preview/v0.7-water-camera` | `dc66fe52d8988f5a6a59a8c5cbaec3e47811a384` | mainの祖先。他の旧ブランチと先端が同一。 |
| `preview/v0.7-water-camera-shelter` | `archive/preview/v0.7-water-camera-shelter` | `dc66fe52d8988f5a6a59a8c5cbaec3e47811a384` | mainの祖先。preview/v0.7-water-cameraと先端が同一。 |
| `preview/verify-git-deployment-20260908` | `archive/preview/verify-git-deployment-20260908` | `e6e63922c54c45272941d402f136d32daed249fa` | デプロイ確認用の記録。タグで保管。 |
| `preview/water-camera-v0.7` | `archive/preview/water-camera-v0.7` | `e2d5a44b9fbad2bcabba8d1988813d67d4c889c4` | PR #1でsquash merge済み。先端のファイル一式はmainのv0.7コミットac4d7e8と完全一致。 |

## 復元

タグを取得し、必要な履歴から作業ブランチを作成できます。

```sh
git fetch origin --prune --tags
git switch -c restored/water-v07 archive/feature/water-v07
```

`archive/` タグは公開版のReleaseタグとは区別し、保管用として保持します。既存のローカル作業ブランチや未コミットの変更はこの整理では変更しません。
