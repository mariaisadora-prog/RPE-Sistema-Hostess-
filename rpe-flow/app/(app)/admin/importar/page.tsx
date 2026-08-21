import { requireRole } from '@/lib/auth';
import ImportarForm from './form';

export default async function ImportarPage() {
  await requireRole(['admin']);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Importar Registros</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Importe registros históricos a partir de um arquivo CSV (Google Forms / Sheets)
        </p>
      </div>
      <ImportarForm />
    </div>
  );
}
