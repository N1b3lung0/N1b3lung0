<!-- markdownlint-disable MD033 MD041 -->

<h1 align="center">Carlos Martínez Crespo</h1>

<p align="center">
  Backend & Full-Stack Developer · Java · Spring Boot · React
</p>

<p align="center">
  <a href="https://www.linkedin.com/in/carlos-martinez-crespo/">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="mailto:carlos.martinez.crespo@gmail.com">
    <img src="https://img.shields.io/badge/Email-open%20to%20collaborate-2ea44f?style=flat-square&logo=gmail&logoColor=white" alt="Email: open to collaborate" />
  </a>
</p>

I design backends around the domain, not the framework: hexagonal architecture, DDD and CQRS on
Java & Spring Boot, with React & Next.js on the front. I care about code that's readable, testable
and built to last, and about the process around it: every change proposed, reviewed and archived
before it ships.

## How I build

```mermaid
flowchart LR
  subgraph driving["What I expose"]
    direction TB
    api["REST APIs<br/>Spring Boot · OpenAPI"]
    web["Web apps<br/>React · Next.js · TypeScript"]
  end

  subgraph core["The core"]
    direction TB
    p1["Pure domain<br/>no framework inside"]
    p2["DDD · CQRS<br/>one aggregate per transaction"]
    p3["Tested by design<br/>ArchUnit · Testcontainers"]
  end

  subgraph driven["What I build on"]
    direction TB
    db[("PostgreSQL · Flyway")]
    cache[("Redis")]
    ops["Docker · GitHub Actions<br/>SonarQube Cloud"]
  end

  driving -->|ports| core -->|ports| driven
```

<sub>Also worked with: Vue · Node.js · NestJS · MongoDB · Strapi · Kubernetes</sub>

## Selected work

My recent projects live in private repositories, so here's what's inside them instead of a link.

**boilerplate** · *private* · a reusable foundation for new products, backend and frontend

- A modular monolith: one Gradle module per bounded context, boundaries enforced by ArchUnit
- Domain events through a transactional outbox: the change and its events commit together, or neither does
- Every write is idempotent (`Idempotency-Key`), every change is audited down to the actor that made it
- Spec-driven workflow with OpenSpec: each feature is proposed, designed, reviewed and archived

`Java 25` `Spring Boot 4` `PostgreSQL` `Redis` `Next.js` `SonarQube Cloud`

**supermarkets** · *private* · price comparator across six Spanish supermarkets

- Scheduled scraping of Mercadona, Carrefour, Alcampo, ALDI, LIDL and DIA, coordinated across instances with ShedLock
- Hexagonal + DDD + CQRS backend with Redis caching and stateless JWT / OAuth2 security
- Observability end to end: Micrometer metrics, OpenTelemetry traces into Jaeger, structured JSON logs
- Next.js 16 frontend with its own visual identity, light and dark themes, Spanish and English

`Java 25` `Spring Boot 4` `PostgreSQL` `Redis` `OpenTelemetry` `Next.js` `Tailwind`

## Now

Building the catalog bounded context of the boilerplate.

## In numbers

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/stats-dark.svg" />
    <img src="assets/stats-light.svg" alt="GitHub activity over the last 12 months, private repositories included" width="100%" />
  </picture>
</p>

<p align="center"><sub>Counts private repositories. Regenerated daily by a GitHub Action in this repo.</sub></p>
