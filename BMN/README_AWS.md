BMN - AWS 배포 가이드 (요약)

이 문서는 BMN 애플리케이션을 AWS에 배포하는 두 가지 일반적인 옵션(Elastic Beanstalk 단일 컨테이너 또는 ECS Fargate)을 안내합니다.

사전조건
- AWS 계정 및 권한(IAM) — ECR, ECS/EB, RDS, CloudWatch 권한 필요
- AWS CLI 설치 및 구성 (aws configure)
- Docker 설치 (이미지 빌드 및 ECR 푸시)

공통 준비: 이미지 빌드와 ECR 푸시
1) Docker 이미지 빌드
```bash
# 프로젝트 루트에서
docker build -t bmn:latest .
```

2) ECR 리포지토리 생성 및 로그인
```bash
aws ecr create-repository --repository-name bmn || true
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.<region>.amazonaws.com
```

3) 태그 및 푸시
```bash
docker tag bmn:latest <AWS_ACCOUNT_ID>.dkr.ecr.<region>.amazonaws.com/bmn:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.<region>.amazonaws.com/bmn:latest
```

옵션 A — Elastic Beanstalk (간단한 단일 컨테이너 배포)
1) EB 애플리케이션/환경 생성 (Console 권장 또는 EB CLI)
2) `Dockerrun.aws.json`(레포지토리에 추가)를 사용하거나, EB 콘솔에서 ECR 이미지 주소를 지정
3) 환경 변수(프로파일 prod, DB 접속 정보 등)를 EB 환경 설정에 추가

옵션 B — ECS (Fargate) + RDS (권장: 더 세밀한 제어)
1) RDS(MySQL) 생성
   - DB 인스턴스 유형, VPC/서브넷, 보안 그룹(컨테이너에서 DB 포트 허용) 설정
   - 데이터베이스 이름: bmn_prod (예시)

2) ECR에 이미지가 있으면 ECS에서 사용
   - 클러스터 생성 (Fargate)
   - Task definition 생성: `ecs-task-def.sample.json`을 템플릿으로 사용
   - Service 생성: ALB(또는 NLB)와 연결하여 외부 트래픽 허용
   - 서비스의 환경 변수로 `SPRING_PROFILES_ACTIVE=prod` 및 DB 접속 정보를 설정

보안 및 운영권장사항
- 민감 정보(DB 비밀번호, JWT 비밀)는 AWS Secrets Manager나 SSM Parameter Store에 저장하고, 컨테이너에서 참조하세요.
- 스키마 변경(Migrations): 운영에서는 `spring.jpa.hibernate.ddl-auto=validate`로 두고 Flyway/Liquibase로 마이그레이션을 관리하세요.
- 로깅: CloudWatch Logs(ecs task의 awslogs 설정 또는 EB 설정 사용)를 설정하세요.

추가 작업(원하면 제가 도와드릴 수 있습니다)
- Terraform/CloudFormation 템플릿 생성
- ECS Fargate 배포 스크립트 (aws cli) 자동화
- RDS 생성 스크립트 예시
- Elastic Beanstalk 환경(.ebextensions) 자동화
- Flyway 설정과 초기 마이그레이션 파일 생성

원하시면 다음 중 한 가지를 바로 생성해 드리겠습니다:
- 간단한 `docker-compose.prod.yml` + `docker` 기반 로컬 스테이징
- Terraform으로 ECS + RDS 스택 예시
- Elastic Beanstalk 배포용 `.ebextensions` + 배포 스크립트

원하시는 배포 방식(EB / ECS-Fargate)과 얼마나 자동화할지 알려주세요.

---

## Reverse proxy / nginx and HTTPS (recommended)

If you're terminating TLS at nginx or a load balancer and proxying to the Spring Boot app, follow these guidelines.

Example nginx configuration (HTTPS termination + proxy to Spring Boot on localhost:8080):

```
server {
   listen 80;
   server_name www.saltylife.co.kr saltylife.co.kr;
   return 301 https://$host$request_uri;
}

server {
   listen 443 ssl http2;
   server_name www.saltylife.co.kr;

   ssl_certificate /etc/letsencrypt/live/www.saltylife.co.kr/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/www.saltylife.co.kr/privkey.pem;

   location / {
      proxy_pass http://127.0.0.1:8080;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Port $server_port;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
   }
}
```

Notes:
- Ensure `X-Forwarded-Proto` and `X-Forwarded-Host` are forwarded so Spring can detect the original scheme/host.
- In `application-prod.properties` we set `server.forward-headers-strategy=framework` so Spring handles forwarded headers.

## Cookie and OAuth considerations

- Cookies carrying `AUTH_TOKEN` should be set with `HttpOnly` and `Secure` when behind HTTPS.
- For OAuth redirects (cross-site), cookies must use `SameSite=None; Secure` to be accepted by modern browsers.
- If you need cookies available across subdomains (e.g. `www.saltylife.co.kr` and `api.saltylife.co.kr`), set cookie Domain to `.saltylife.co.kr`.

## app.frontend.url / app.external.url (production)

- These properties are used to build absolute links in emails (verification links) and as canonical frontend base.
- Provide them via environment variables in production. Example environment variable names used by `application-prod.properties`:

```
APP_FRONTEND_URL=https://www.saltylife.co.kr
APP_EXTERNAL_URL=https://www.saltylife.co.kr
JWT_SECRET=<secure-random-secret>
```

## CI / Docker / EB examples

- Docker run with env vars:

```
docker run -e APP_EXTERNAL_URL=https://www.saltylife.co.kr -e JWT_SECRET="$(openssl rand -hex 32)" -p 8080:8080 your-image:latest
```

- GitHub Actions env snippet:

```
env:
  APP_EXTERNAL_URL: https://www.saltylife.co.kr
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

- Elastic Beanstalk (eb) setenv example:

```
eb setenv APP_EXTERNAL_URL=https://www.saltylife.co.kr JWT_SECRET=... APP_FRONTEND_URL=https://www.saltylife.co.kr
```

## Troubleshooting

- If verification emails contain `localhost` links, confirm env vars are set and the app is running with the `prod` profile or using `application-prod.properties`.
- If cookies are not persisted after OAuth redirect, verify `SameSite` and `Secure` attributes and that the proxy forwards `X-Forwarded-Proto`.
