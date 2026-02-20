import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Clock, Banknote, CheckSquare, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProjectenDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/projecten/dashboard/overzicht`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Projecten Dashboard</h1>
          <p className="text-muted-foreground">Beheer uw projecten en urenregistratie</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actieve Projecten</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.actieve_projecten || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/projecten/overzicht')}>
              Bekijk alle <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uren Deze Maand</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.uren_deze_maand?.toFixed(1) || 0}</div>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/app/projecten/uren')}>
              Urenregistratie <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kosten Deze Maand</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SRD {dashboard?.kosten_deze_maand?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">project kosten</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Per Status</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {dashboard?.per_status && Object.entries(dashboard.per_status).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Projecten (Uren)</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard?.top_projecten?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.top_projecten.map((project, index) => (
                <div key={project._id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{project.naam}</span>
                  </div>
                  <span className="font-bold">{project.totaal_uren?.toFixed(1)} uur</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Geen projecten met uren</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={() => navigate('/app/projecten/overzicht')}>
          <Briefcase className="mr-2 h-4 w-4" /> Projecten Beheren
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/projecten/uren')}>
          <Clock className="mr-2 h-4 w-4" /> Uren Registreren
        </Button>
      </div>
    </div>
  );
}
