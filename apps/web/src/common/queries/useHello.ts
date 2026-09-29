import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../queryKeys";
import { getHello } from "../services/hello.api";

export const useHello = () => {
  return useQuery({
    queryKey: queryKeys.users,

    queryFn: getHello,
  });
};
