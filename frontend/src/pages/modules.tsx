import { Bell, Cog, Database, History, House, Monitor, Network, Server, Settings } from 'lucide-react'
import { ModulePendingPage } from './ModulePendingPage'

export const DashboardPending = () => (
  <ModulePendingPage
    icon={House}
    title="Tableau de bord"
    subtitle="Vue d’ensemble de votre réseau"
    backend="monitoring"
    planned={[
      'Machines totales, en ligne, hors ligne et en alerte, avec période 1 h à 30 j',
      'Trafic réseau entrant et sortant, disponibilité du réseau',
      'État des machines, services principaux et alertes récentes',
      'État du système hôte : CPU, mémoire et disque',
    ]}
  />
)

export const MachinesPending = () => (
  <ModulePendingPage
    icon={Monitor}
    title="Machines"
    subtitle="Liste et état de toutes les machines du réseau"
    backend="inventory"
    planned={[
      'Liste filtrable par groupe et statut, tri par nom, IP, statut ou latence',
      'Ajout, modification, suppression et actions groupées',
      'Vues liste, carte et graphique, fiche détail de chaque machine',
    ]}
  />
)

export const ServicesPending = () => (
  <ModulePendingPage
    icon={Cog}
    title="Services"
    subtitle="Contrôles HTTP, HTTPS, TCP, DNS, SMTP et ping"
    backend="inventory"
    planned={['Services rattachés à une machine, avec port, intervalle et délai maximal', 'Statut, temps de réponse et historique de chaque contrôle']}
  />
)

export const NetworkPending = () => (
  <ModulePendingPage
    icon={Network}
    title="Réseau"
    subtitle="Trafic, sous-réseau et équipements détectés"
    backend="monitoring"
    planned={['Trafic par interface, débit actuel et pic sur la période', 'Sous-réseau, passerelle et DNS', 'Équipements détectés et nouveaux équipements inconnus']}
  />
)

export const ServersPending = () => (
  <ModulePendingPage
    icon={Server}
    title="Serveurs"
    subtitle="Gestion et supervision de vos serveurs"
    backend="monitoring"
    planned={['Disponibilité moyenne, charge CPU, RAM et disque de chaque serveur', 'Services du serveur et journaux récents', 'Actions rapides : tester, voir les logs, redémarrer']}
  />
)

export const AlertsPending = () => (
  <ModulePendingPage
    icon={Bell}
    title="Alertes"
    subtitle="Notifications et événements importants"
    backend="alerts"
    planned={['Alertes actives, avertissements et critiques par période', 'Acquittement et résolution (rôles autorisés)', 'Règles d’alerte et graphique par tranche horaire']}
  />
)

export const HistoryPending = () => (
  <ModulePendingPage
    icon={History}
    title="Historique"
    subtitle="Consultez l’historique complet des événements et incidents"
    backend="history"
    planned={['Évolution et répartition des événements sur 1 j à 1 an', 'Table filtrable avec panneau de détails', 'Export CSV']}
  />
)

export const SettingsPending = () => (
  <ModulePendingPage
    icon={Settings}
    title="Paramètres"
    subtitle="Configurez votre système de supervision réseau"
    backend="settings_app"
    planned={[
      'Général, surveillance (intervalle, délai, tentatives, seuil de latence)',
      'Notifications e-mail, Telegram et webhook, avec test',
      'Stockage, maintenance et réinitialisation aux valeurs par défaut',
    ]}
  />
)

export const BackupsPending = () => (
  <ModulePendingPage
    icon={Database}
    title="Sauvegardes"
    subtitle="Sauvegarde de la base de données"
    backend="settings_app"
    planned={['Sauvegarde manuelle et liste des sauvegardes (date, taille)', 'Statut de la dernière sauvegarde']}
  />
)
