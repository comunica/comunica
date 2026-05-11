You are tasked to solve this comunica issue: https://github.com/comunica/comunica/issues/1643
This comment of Jitse contains the action plan within the comunica repo: https://github.com/comunica/comunica/issues/1643#issuecomment-4418720138

The required changes for Traqula have been performed (already linked localy).
Furthermore, I have already changed the toAlgebra option to `quads: false`.
You should now implement the `actor-query-operation-graph` and `actor-optimize-quad-subsitution`.
Note that the substitution should NOT happen in the cases specified within the issue's [original post](https://github.com/comunica/comunica/issues/1643#issue-3580907756).
The graph operator is explained in https://www.w3.org/TR/sparql12-query/#defn_evalGraph .
Refrain from adding any context options.

Before you stop, reflect on your changes and commit your changes.
For example: did you add sufficient tests to the actors you added and also integration tests where needed?  
Also verify whether the added packages respect the same structure as the existing packages, meaning: do you have a populated readme, package.json etc. 
Only stop once you successfully committed the code. (note that the spec test talked about in the issue should be enabled in the final commit).
When the code changes would be prettier if some happened within Traqula, you are allowed to change Traqula (to the extent required and only if it makes sense for the code to be in that project). 
