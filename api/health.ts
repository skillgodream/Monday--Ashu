export default async function handler(_req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    environment: 'vercel-serverless',
    time: new Date().toISOString(),
  });
}
