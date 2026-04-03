export type School = {
  id: string;
  name: string;
  address: string;
  classes: string;
  students: string;
  accent: string;
  initials: string;
};

export const schools: School[] = [
  {
    id: 'green-valley',
    name: 'Green Valley Academy',
    address: '1224 Meadow Lane, Springfield, IL',
    classes: '32 Groups',
    students: '840 Total',
    accent: '#DDF7EC',
    initials: 'GV',
  },
  {
    id: 'beacon-heights',
    name: 'Beacon Heights Prep',
    address: '45 North Ridgeview, Lake Forest, IL',
    classes: '24 Groups',
    students: '610 Total',
    accent: '#DBEAFF',
    initials: 'BH',
  },
  {
    id: 'riverside-tech',
    name: 'Riverside Tech Center',
    address: '902 Water St, Chicago, IL',
    classes: '48 Groups',
    students: '1,200 Total',
    accent: '#FFE2C6',
    initials: 'RT',
  },
  {
    id: 'st-jude',
    name: 'St. Jude Grammar',
    address: '77 Church St, Peoria, IL',
    classes: '12 Groups',
    students: '320 Total',
    accent: '#F3E8FF',
    initials: 'SJ',
  },
  {
    id: 'cardinal-high',
    name: 'Cardinal High',
    address: '200 Eagle Dr, Naperville, IL',
    classes: '56 Groups',
    students: '1,450 Total',
    accent: '#FEE2E2',
    initials: 'CH',
  },
];
