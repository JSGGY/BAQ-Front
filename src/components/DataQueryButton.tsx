'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Tipo para los usuarios
type User = {
  id: number;
  name: string;
  cedula: string;
  email: string;
};

export function DataQueryButton() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Datos de conexión para mostrar (para propósitos informativos)
  const connectionInfo = {
    host: 'db.nucrceisrgwinfejiuur.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres'
  };

  // Función para obtener usuarios usando nuestra API route
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al obtener usuarios');
      }
      
      setUsers(result.data || []);
      console.log('Datos obtenidos:', result.data);
    } catch (err: any) {
      console.error('Error al obtener usuarios:', err);
      setError(err.message || 'Error al obtener usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Función para insertar un usuario de prueba
  const insertTestUser = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const userData = {
        name: 'Juan Pérez',
        cedula: '0102030405',
        email: 'juan.perez@example.com'
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al insertar usuario');
      }
      
      setSuccessMessage('Usuario insertado correctamente');
      await fetchUsers(); // Refrescar la lista de usuarios
    } catch (err: any) {
      console.error('Error al insertar usuario:', err);
      setError(err.message || 'Error al insertar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed bottom-4 right-4 z-40">
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Consultar Datos
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-4">
            Datos de Usuarios (Supabase)
          </DialogTitle>
        </DialogHeader>

        <div className="mb-6 flex justify-center">
          <Button 
            onClick={insertTestUser}
            className="bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            Insertar Usuario de Prueba
          </Button>
        </div>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <p>{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No se encontraron usuarios.</p>
            <p className="text-sm text-gray-400 mt-2">Utiliza el botón "Insertar Usuario de Prueba" para crear uno.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">Nombre</th>
                  <th className="border p-2 text-left">Cédula</th>
                  <th className="border p-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="border p-2">{user.id}</td>
                    <td className="border p-2">{user.name}</td>
                    <td className="border p-2">{user.cedula}</td>
                    <td className="border p-2">{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>String de conexión:</p>
          <p className="font-mono break-all text-[10px]">{JSON.stringify(connectionInfo)}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 