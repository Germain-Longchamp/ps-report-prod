import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Studio Hub</h1>
        <p className="text-gray-500 mb-8">PS Report - Version SaaS</p>
        <Button>Connexion</Button>
      </div>
    </div>
  );
}
