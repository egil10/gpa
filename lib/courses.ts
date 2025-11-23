import { UNIVERSITIES } from './api';

export interface CourseInfo {
  code: string;
  name: string;
  institution: string;
  institutionCode: string;
}

// Popular courses database - can be expanded
export const POPULAR_COURSES: CourseInfo[] = [
  // UiO courses
  { code: 'IN2010', name: 'Algoritmer og datastrukturer', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1010', name: 'Programmering', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2000', name: 'Objektorientert programmering', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2090', name: 'Databaser', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2020', name: 'Systemutvikling', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN2140', name: 'Operativsystemer', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK1100', name: 'Sannsynlighetsregning og statistikk', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT1100', name: 'Kalkulus', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT1110', name: 'Kalkulus og lineær algebra', institution: 'UiO', institutionCode: '1110' },
  { code: 'ECON1100', name: 'Grunnkurs i samfunnsøkonomi', institution: 'UiO', institutionCode: '1110' },
  { code: 'PSYK1001', name: 'Innføring i psykologi', institution: 'UiO', institutionCode: '1110' },
  { code: 'JUS1100', name: 'Rettslære', institution: 'UiO', institutionCode: '1110' },
  
  // NTNU courses
  { code: 'TDT4100', name: 'Objektorientert programmering', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4110', name: 'Datastrukturer og algoritmer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4120', name: 'Algoritmer og datastrukturer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4135', name: 'Kunstig intelligens', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4140', name: 'Programvareutvikling', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4145', name: 'Datamodellering og databasesystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4173', name: 'Informasjonssystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4100', name: 'Matematikk 1', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4115', name: 'Kalkulus 3', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TMA4140', name: 'Diskret matematikk', institution: 'NTNU', institutionCode: '1150' },
  
  // UiB courses
  { code: 'INF100', name: 'Grunnkurs i programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'INF101', name: 'Objektorientert programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'INF102', name: 'Algoritmer, datastrukturer og programmering', institution: 'UiB', institutionCode: '1120' },
  { code: 'MAT111', name: 'Kalkulus', institution: 'UiB', institutionCode: '1120' },
  
  // OsloMet courses
  { code: 'DAT1000', name: 'Grunnleggende programmering', institution: 'OsloMet', institutionCode: '1175' },
  { code: 'DAT1100', name: 'Objektorientert programmering', institution: 'OsloMet', institutionCode: '1175' },
  
  // BI courses
  { code: 'BØK110', name: 'Grunnleggende bedriftsøkonomi', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK120', name: 'Finansregnskap', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK130', name: 'Bedriftsøkonomi', institution: 'BI', institutionCode: '8241' },
  { code: 'BØK140', name: 'Markedsføring', institution: 'BI', institutionCode: '8241' },
  
  // More UiO courses
  { code: 'IN1000', name: 'Introduksjon til datamaskiner og datamaskinarkitektur', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1050', name: 'Brukerorientert design', institution: 'UiO', institutionCode: '1110' },
  { code: 'IN1150', name: 'Webteknologi', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK2100', name: 'Modellering og simulering', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2400', name: 'Lineær algebra', institution: 'UiO', institutionCode: '1110' },
  
  // More NTNU courses
  { code: 'TDT4180', name: 'Menneske-maskin interaksjon', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4186', name: 'Operativsystemer', institution: 'NTNU', institutionCode: '1150' },
  { code: 'TDT4200', name: 'Algoritmer og datastrukturer', institution: 'NTNU', institutionCode: '1150' },
  
  // UiO Computer Science and Data Science courses
  { code: 'CS5930AMRA', name: 'Applied Mathematics, Mechanics and Numerical Physics, Master thesis', institution: 'UiO', institutionCode: '1110' },
  { code: 'CS5930MECH', name: 'CS: Mechanics - Master thesis', institution: 'UiO', institutionCode: '1110' },
  { code: 'CS5960AMRA', name: 'CS: Applied Mathematics and Risk Analysis - Masteroppgave', institution: 'UiO', institutionCode: '1110' },
  { code: 'CS5960MECH', name: 'CS: Mechanics - Master thesis', institution: 'UiO', institutionCode: '1110' },
  { code: 'DS5930', name: "Master's thesis in Data Science, 30 studiepoeng", institution: 'UiO', institutionCode: '1110' },
  { code: 'DS5960', name: "Master's thesis in Data Science, 60 ECTS", institution: 'UiO', institutionCode: '1110' },
  
  // UiO Mathematics courses
  { code: 'MAT-IN9240', name: 'Numerical analysis of PDEs', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT-INF3600', name: 'Mathematical Logic', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT-MEK4270', name: 'Numerical methods for partial differential equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT-MEK9270', name: 'Numerical methods for partial differential equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2000', name: 'Project Work in Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2200', name: 'Groups, Rings and Fields', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2400', name: 'Real Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT2410', name: 'Introduction to Complex Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3100', name: 'Linear optimization', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3110', name: 'Introduction to Numerical Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3250', name: 'Discrete Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3360', name: 'Introduction to Partial Differential Equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3400', name: 'Linear Analysis with Applications', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3420', name: 'Quantum Computing', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3440', name: 'Dynamical systems', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT3500', name: 'Topology', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4110', name: 'Introduction to Numerical Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4120', name: 'Mathematical Optimization', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4170', name: 'Spline Methods', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4200', name: 'Commutative Algebra', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4210', name: 'Algebraic Geometry I', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4215', name: 'Algebraic Geometry II', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4230', name: 'Algebraic Geometry III', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4240', name: 'Elliptic curves', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4250', name: 'Number Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4270', name: 'Representation Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4301', name: 'Partial Differential Equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4305', name: 'Partial Differential Equations and Sobolev Spaces', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4400', name: 'Linear Analysis with Applications', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4410', name: 'Advanced Linear Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4430', name: 'Quantum information theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4450', name: 'Advanced Functional Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4460', name: 'C*-algebras', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4500', name: 'Topology', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4510', name: 'Geometric Structures', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4520', name: 'Manifolds', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4530', name: 'Algebraic Topology I', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4540', name: 'Algebraic Topology II', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4551', name: 'Symplectic geometry', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4580', name: 'Algebraic Topology III', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4590', name: 'Differential Geometry', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4595', name: 'Geometry and analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4720', name: 'Stochastic Analysis and Stochastic Differential Equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4735', name: 'Advanced financial modelling', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4740', name: 'Malliavin Calculus and Applications', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4750', name: 'Mathematical Finance: Modelling and Risk Management', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4760', name: 'Advanced Mathematical Methods in Finance', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4770', name: 'Stochastic Modelling in Energy and Commodity Markets', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4790', name: 'Stochastic Filtering', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4800', name: 'Complex Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4810', name: 'Introduction to Several Complex Variables', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4820', name: 'Complex Dynamics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4830', name: 'Topics in complex analysis and dynamics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT4930', name: 'Graduate research', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT5930', name: 'Master thesis in Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT5960', name: 'Master thesis in Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9120', name: 'Mathematical Optimization', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9170', name: 'Spline Methods', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9210', name: 'Algebraic Geometry I', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9215', name: 'Algebraic Geometry II', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9230', name: 'Algebraic Geometry III', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9240', name: 'Elliptic Curves', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9270', name: 'Representation Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9305', name: 'Partial Differential Equations and Sobolev Spaces', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9390', name: 'Topics in Operator Algebras', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9460', name: 'C*-algebras', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9520', name: 'Manifolds', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9530', name: 'Algebraic Topology I', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9540', name: 'Algebraic Topology II', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9551', name: 'Symplectic geometry', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9560', name: 'Lie groups', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9570', name: 'Algebraic K-theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9580', name: 'Algebraic Topology III', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9590', name: 'Differential Geometry', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9595', name: 'Geometry and analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9650', name: 'Advanced Topics in Logic', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9720', name: 'Stochastic Analysis and Stochastic Differential Equations', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9735', name: 'Advanced financial modelling', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9740', name: 'Malliavin Calculus and Applications', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9750', name: 'Mathematical Finance: Modelling and Risk Management', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9760', name: 'Advanced Mathematical Methods in Finance', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9770', name: 'Stochastic Modelling in Energy and Commodity Markets', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9790', name: 'Stochastic Filtering', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9800', name: 'Complex Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9810', name: 'Introduction to Several Complex Variables', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9820', name: 'Complex Dynamics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MAT9830', name: 'Topics in complex analysis and dynamics', institution: 'UiO', institutionCode: '1110' },
  
  // UiO Mechanics courses
  { code: 'MEK3200', name: 'Project Work in Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK3700', name: 'Current topics in bio-mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK3800', name: 'Environmental fluid mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4020', name: 'Viscous liquids and elastic materials', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4100', name: 'Mathematical Methods in Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4250', name: 'Finite Element Methods in Computational Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4300', name: 'Viscous Flow and Turbulence', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4320', name: 'Hydrodynamic Wave Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4350', name: 'Stochastic and Nonlinear Ocean Waves', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4400', name: 'Theory of Hydrodynamic Stability', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4410', name: 'Offshore wind and aerodynamics of wind turbines', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4420', name: 'Marine Hydrodynamics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4470', name: 'Computational Fluid Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4480', name: 'Free surface flows', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4490', name: 'Project in Fluid Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4600', name: 'Experimental Methods in Fluid Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4700', name: 'Current topics in bio-mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4800', name: 'Environmental fluid mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK4930', name: 'Graduate research in Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK5930', name: "Master's thesis in Fluid Mechanics, 30 ECTS", institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK5960', name: "Master's thesis in Fluid Mechanics, 60 ECTS", institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9250', name: 'Finite Element Methods in Computational Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9300', name: 'Viscous Flow and Turbulence', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9320', name: 'Hydrodynamic Wave Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9350', name: 'Stochastic and Nonlinear Ocean Waves', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9400', name: 'Theory of Hydrodynamic Stability', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9410', name: 'Offshore wind and aerodynamics of wind turbines', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9420', name: 'Marine Hydrodynamics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9430', name: 'Multiphase Flow', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9460', name: 'LES in marine hydrodynamics and offshore wind power', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9470', name: 'Computational Fluid Mechanics', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9480', name: 'Free Surface Flows', institution: 'UiO', institutionCode: '1110' },
  { code: 'MEK9600', name: 'Experimental Methods in Fluid Mechanics', institution: 'UiO', institutionCode: '1110' },
  
  // UiO Stochastic Modelling, Statistics and Risk Analysis courses
  { code: 'SMR5930', name: 'Stochastic Modelling, Statistics and Risk Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'SMR5960', name: "Stochastic Modelling, Statistics and Risk Analysis - Master's Thesis 60 ECTS", institution: 'UiO', institutionCode: '1110' },
  
  // UiO Statistics courses
  { code: 'STK-IN4300', name: 'Statistical Learning Methods in Data Science', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-IN4355', name: 'Internship in Data Science', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-IN9300', name: 'Statistical Learning Methods in Data Science', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-MAT2011', name: 'Project Work in Finance, Insurance, Risk and Data Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-MAT3700', name: 'Introduction to Mathematical Finance and Investment Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-MAT3710', name: 'Probability Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-MAT4700', name: 'Introduction to Mathematical Finance and Investment Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK-MAT4710', name: 'Probability Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK2100', name: 'Machine Learning and Statistical Methods for Prediction and Classification', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK2130', name: 'Modelling by Stochastic Processes', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK3100', name: 'Introduction to Generalized Linear Models', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK3405', name: 'Introduction to Risk and Reliability Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK3505', name: 'Introduction to Insurance Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4000', name: 'Special curriculum and seminar', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4011', name: 'Statistical Inference Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4021', name: 'Applied Bayesian Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4051', name: 'Computational Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4060', name: 'Time Series', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4080', name: 'Survival and Event History Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4090', name: 'Statistical large-sample theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4100', name: 'Introduction to Generalized Linear Models', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4141', name: 'Probabilistic graphical models', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4150', name: 'Environmental and Spatial Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4160', name: 'Statistical Model Selection', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4180', name: 'Confidence distributions', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4190', name: 'Bayesian nonparametrics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4205', name: 'Short course in selected topics of statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4215', name: 'Specialized topics in statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4290', name: 'Selected Themes in Advanced Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4400', name: 'Risk and Reliability Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4405', name: 'Introduction to Risk and Reliability Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4500', name: 'Life Insurance and Finance', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4505', name: 'Introduction to Insurance Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4530', name: "Interest Rate Modelling via SPDE's", institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4540', name: 'Non-Life Insurance Mathematics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4550', name: 'Extreme value statistics and large devia-tions', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4610', name: 'Statistical methods for social sciences: Survey sampling', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4900', name: 'Statistical Methods and Applications', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK4930', name: 'Graduate research in Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9011', name: 'Statistical Inference Theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9021', name: 'Applied Bayesian Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9051', name: 'Computational Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9060', name: 'Time Series', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9080', name: 'Survival and Event History Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9090', name: 'Statistical large-sample theory', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9141', name: 'Probabilistic graphical models', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9150', name: 'Environmental and Spatial Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9160', name: 'Statistical Model Selection', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9180', name: 'Confidence Distributions', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9190', name: 'Bayesian nonparametrics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9200', name: 'Advanced Statistical Methods', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9205', name: 'Short Course in Selected Topics of Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9215', name: 'Specialized Topics in Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9290', name: 'Selected Themes in Advanced Statistics', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9400', name: 'Risk and Reliability Analysis', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9500', name: 'Life Insurance and Finance', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9530', name: "Interest Rate Modelling via SPDE's", institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9550', name: 'Extreme value statistics and large devia-tions', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9610', name: 'Statistical methods for social sciences: Survey sampling', institution: 'UiO', institutionCode: '1110' },
  { code: 'STK9900', name: 'Statistical Methods and Applications', institution: 'UiO', institutionCode: '1110' },
];

export function searchCourses(query: string, institutionFilter?: string): CourseInfo[] {
  const normalizedQuery = query.trim().toUpperCase();
  if (!normalizedQuery) return [];

  return POPULAR_COURSES.filter((course) => {
    const matchesQuery = 
      course.code.toUpperCase().includes(normalizedQuery) ||
      course.name.toUpperCase().includes(normalizedQuery);
    
    const matchesInstitution = !institutionFilter || course.institution === institutionFilter;
    
    return matchesQuery && matchesInstitution;
  }).slice(0, 10); // Limit to 10 results
}

export function getCourseByCode(code: string, institution?: string): CourseInfo | null {
  const normalizedCode = code.trim().toUpperCase();
  const course = POPULAR_COURSES.find((c) => {
    const matchesCode = c.code.toUpperCase() === normalizedCode;
    const matchesInstitution = !institution || c.institution === institution;
    return matchesCode && matchesInstitution;
  });
  
  return course || null;
}

export function getInstitutionForCourse(courseCode: string): string | null {
  const course = getCourseByCode(courseCode);
  return course ? course.institution : null;
}

export function getCoursesForInstitution(institution: string): CourseInfo[] {
  return POPULAR_COURSES.filter((c) => c.institution === institution);
}

