# Third-party assets

| Asset | Author | Source | License | Used in |
| --- | --- | --- | --- | --- |
| Whale (base mesh) | [Quaternius](https://quaternius.com) | [poly.pizza/m/JGFwp6xWgk](https://poly.pizza/m/JGFwp6xWgk) | [CC0 1.0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/) | `public/models/whale.glb` — restyled (faceted materials, cargo deck, neon edges) |

CC0 does not require attribution; credited anyway. All other 3D models (`cluster_node`, `helm_wheel`,
`shipping_container`) are original work made in Blender for this project.

## Tool and service logos (dashboard chips)

Small monochrome logos next to each tool / AWS service name in the Observability dashboard, served
as one sprite (`public/icons/brands.svg`, built by `scripts/icons/build-brand-icons.mjs`). They
only identify the tools used; all trademarks belong to their owners, and no endorsement is implied.

| Logos | Source | License |
| --- | --- | --- |
| Docker, Kubernetes, NGINX, Terraform, GitHub Actions, Python, PostgreSQL, MySQL, Prometheus, Grafana | [Simple Icons](https://simpleicons.org) 16.35.0 | [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) (brand guidelines of each owner apply) |
| Jenkins | Simple Icons 16.35.0, from the [Jenkins project](https://www.jenkins.io/artwork/) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| GNU Bash | Simple Icons 16.35.0 | MIT |
| AWS service icons (EC2, S3, VPC, IAM, RDS, EKS, Lambda, …) | [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (package 2026-07-31), 16 px service icons, white glyph only, recoloured | [AWS Architecture Icons terms](https://aws.amazon.com/architecture/icons/) |

Names without an icon in either set (Docker Compose, Boto3) show a neutral dot.
