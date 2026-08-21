import React from 'react';
import CSECard from './CSECard';
import AIMLCard from './AIMLCard';
import DataScienceCard from './DataScienceCard';
import CyberSecurityCard from './CyberSecurityCard';
import ISECard from './ISECard';
import ECECard from './ECECard';
import CivilCard from './CivilCard';
import MechanicalCard from './MechanicalCard';
import MBACard from './MBACard';
import MathematicsCard from './MathematicsCard';
import PhysicsCard from './PhysicsCard';
import ChemistryCard from './ChemistryCard';
import BusinessSystemsCard from './BusinessSystemsCard';

const COMPONENT_MAP: Record<string, any> = {
  'CSE': CSECard,
  'CSE (AI & ML)': AIMLCard,
  'CSE (Data Science)': DataScienceCard,
  'CSE (Cyber Security)': CyberSecurityCard,
  'CSE (Business Systems)': BusinessSystemsCard,
  'ISE': ISECard,
  'ECE': ECECard,
  'Civil': CivilCard,
  'Mechanical': MechanicalCard,
  'MBA': MBACard,
  'Mathematics': MathematicsCard,
  'Physics': PhysicsCard,
  'Chemistry': ChemistryCard,
  'Basic Sciences': (props: any) => <PhysicsCard {...props} departmentId={props.departmentId} />, // Fallback or summary
};

export default function DepartmentCardFactory({ 
  departmentId, 
  ...props 
}: { 
  departmentId: string;
  [key: string]: any;
}) {
  const Component = COMPONENT_MAP[departmentId] || COMPONENT_MAP['CSE'];
  return <Component {...props} departmentId={departmentId} />;
}

export function hasDedicatedDepartmentFactoryCard(departmentId: string): boolean {
  return Object.prototype.hasOwnProperty.call(COMPONENT_MAP, departmentId);
}
