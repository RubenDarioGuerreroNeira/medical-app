import { Query, Resolver } from "@nestjs/graphql";

@Resolver()
export class AppResolver {
  @Query(() => String) // Define que esta query devuelve un String
  sayHello(): string {
    return "Hello World from GraphQL!";
  }
}
