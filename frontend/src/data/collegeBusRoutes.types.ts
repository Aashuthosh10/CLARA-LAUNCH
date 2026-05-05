export type CollegeBusStop = {
  name: string;
  time: string;
};

export type CollegeBusPerson = {
  name: string;
  phone: string;
};

export type CollegeBusRoute = {
  route_number: number;
  driver: CollegeBusPerson;
  coordinator: CollegeBusPerson | null;
  stops: CollegeBusStop[];
};

export type CollegeBusRoutesData = {
  routes: CollegeBusRoute[];
};
